package privacy

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestPrivacyLifecycle(t *testing.T) {
	databaseURL:=os.Getenv("TEST_DATABASE_URL");if databaseURL==""{t.Skip("TEST_DATABASE_URL is not set")}
	ctx:=context.Background();pool,err:=pgxpool.New(ctx,databaseURL);if err!=nil{t.Fatal(err)};defer pool.Close()
	for _,name:=range []string{"0001_core.sql","0007_privacy.sql"}{body,err:=os.ReadFile(filepath.Join("..","..","migrations",name));if err!=nil{t.Fatal(err)};if _,err:=pool.Exec(ctx,string(body));err!=nil{t.Fatalf("apply %s: %v",name,err)}}
	if _,err:=pool.Exec(ctx,`TRUNCATE privacy_consents,privacy_requests,outbox_events CASCADE`);err!=nil{t.Fatal(err)}
	svc,err:=New(ctx,databaseURL);if err!=nil{t.Fatal(err)};defer svc.Close()
	consent,err:=svc.SetConsent(ctx,"user-1","impact-research",true,"2026-08");if err!=nil{t.Fatal(err)};if !consent.Granted{t.Fatal("consent not granted")}
	consents,err:=svc.Consents(ctx,"user-1");if err!=nil||len(consents)!=1{t.Fatalf("consents=%v err=%v",consents,err)}
	req,err:=svc.Request(ctx,"user-1","export");if err!=nil{t.Fatal(err)};if req.Status!="requested"{t.Fatalf("status=%s",req.Status)}
	requests,err:=svc.Requests(ctx,"user-1");if err!=nil||len(requests)!=1{t.Fatalf("requests=%v err=%v",requests,err)}
	var events int;if err:=pool.QueryRow(ctx,`SELECT count(*) FROM outbox_events WHERE aggregate_type IN ('privacy_consent','privacy_request')`).Scan(&events);err!=nil{t.Fatal(err)};if events!=2{t.Fatalf("privacy outbox events=%d",events)}
}
