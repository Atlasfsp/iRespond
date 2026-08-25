package evidence

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"
)

func TestSignedUploadLifecycle(t *testing.T) {
	dbURL:=os.Getenv("TEST_DATABASE_URL"); endpoint:=os.Getenv("TEST_OBJECT_STORAGE_ENDPOINT")
	if dbURL==""||endpoint==""{t.Skip("integration services not configured")}
	ctx:=context.Background()
	pool,err:=pgxpool.New(ctx,dbURL);if err!=nil{t.Fatal(err)};defer pool.Close()
	for _,name:=range []string{"0001_core.sql","0002_evidence.sql"}{b,err:=os.ReadFile(filepath.Join("..","..","migrations",name));if err!=nil{t.Fatal(err)};if _,err:=pool.Exec(ctx,string(b));err!=nil{t.Fatalf("apply %s: %v",name,err)}}
	if _,err:=pool.Exec(ctx,`TRUNCATE need_evidence, need_verifications, idempotency_keys, outbox_events, needs CASCADE`);err!=nil{t.Fatal(err)}
	if _,err:=pool.Exec(ctx,`INSERT INTO needs(id,title,description,category,reporter_id,verification_state,sdg_tags,location) VALUES('evidence-need','Blocked drain','Drain is blocked','sanitation','reporter','observed','{6}',ST_SetSRID(ST_MakePoint(3.37,6.52),4326)::geography)`);err!=nil{t.Fatal(err)}

	cfg:=Config{DatabaseURL:dbURL,Endpoint:endpoint,AccessKey:"irespond",SecretKey:"irespond-secret",Bucket:"irespond-evidence",Secure:false}
	svc,err:=New(ctx,cfg);if err!=nil{t.Fatal(err)};defer svc.Close()
	exists,err:=svc.objects.BucketExists(ctx,cfg.Bucket);if err!=nil{t.Fatal(err)};if !exists{if err:=svc.objects.MakeBucket(ctx,cfg.Bucket,minio.MakeBucketOptions{});err!=nil{t.Fatal(err)}}

	payload:=[]byte("evidence-bytes")
	upload,err:=svc.Initiate(ctx,"evidence-need","person-1","image/jpeg",int64(len(payload)),"");if err!=nil{t.Fatal(err)}
	req,err:=http.NewRequest(http.MethodPut,upload.UploadURL,bytes.NewReader(payload));if err!=nil{t.Fatal(err)};req.Header.Set("Content-Type","image/jpeg")
	resp,err:=http.DefaultClient.Do(req);if err!=nil{t.Fatal(err)};resp.Body.Close();if resp.StatusCode<200||resp.StatusCode>=300{t.Fatalf("upload status=%d",resp.StatusCode)}
	record,err:=svc.Complete(ctx,"evidence-need",upload.EvidenceID,"person-1");if err!=nil{t.Fatal(err)};if record.Status!="available"{t.Fatalf("status=%s",record.Status)}
	access,err:=svc.AccessURL(ctx,"evidence-need",upload.EvidenceID);if err!=nil{t.Fatal(err)}
	get,err:=http.Get(access);if err!=nil{t.Fatal(err)};defer get.Body.Close();body,_:=io.ReadAll(get.Body);if !bytes.Equal(body,payload){t.Fatalf("download mismatch: %q",body)}
}
