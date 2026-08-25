package projects

import (
  "context"
  "errors"
  "os"
  "path/filepath"
  "testing"

  "github.com/jackc/pgx/v5/pgxpool"
)

func TestVerifiedNeedProjectConversion(t *testing.T){
  dbURL:=os.Getenv("TEST_DATABASE_URL");if dbURL==""{t.Skip("database integration service not configured")};ctx:=context.Background();pool,err:=pgxpool.New(ctx,dbURL);if err!=nil{t.Fatal(err)};defer pool.Close()
  for _,name:=range []string{"0001_core.sql","0003_projects.sql"}{b,err:=os.ReadFile(filepath.Join("..","..","migrations",name));if err!=nil{t.Fatal(err)};if _,err:=pool.Exec(ctx,string(b));err!=nil{t.Fatalf("apply %s: %v",name,err)}}
  if _,err:=pool.Exec(ctx,`TRUNCATE project_roles,project_milestones,action_projects,need_verifications,idempotency_keys,outbox_events,needs CASCADE`);err!=nil{t.Fatal(err)}
  if _,err:=pool.Exec(ctx,`INSERT INTO needs(id,title,description,category,reporter_id,verification_state,sdg_tags,location) VALUES('unverified','Observed drain','x','sanitation','reporter','observed','{6}',ST_SetSRID(ST_MakePoint(3.37,6.52),4326)::geography),('verified','Verified library need','x','education','reporter','community_confirmed','{4,10}',ST_SetSRID(ST_MakePoint(3.38,6.53),4326)::geography)`);err!=nil{t.Fatal(err)}
  svc,err:=New(ctx,dbURL);if err!=nil{t.Fatal(err)};defer svc.Close()
  if _,err:=svc.CreateFromNeed(ctx,CreateInput{NeedID:"unverified",CreatedBy:"person-1"});!errors.Is(err,ErrNeedNotConfirmed){t.Fatalf("unverified conversion err=%v",err)}
  budget:=int64(25000000);days:=30
  p,err:=svc.CreateFromNeed(ctx,CreateInput{NeedID:"verified",CreatedBy:"person-1",Summary:"Restore library lighting and books",Currency:"ngn",EstimatedBudgetMinor:&budget,TargetDays:&days});if err!=nil{t.Fatal(err)}
  if p.Status!="draft"||p.Title!="Verified library need"||len(p.SDGTags)!=2{t.Fatalf("unexpected project: %+v",p)}
  if _,err:=svc.CreateFromNeed(ctx,CreateInput{NeedID:"verified",CreatedBy:"person-2"});!errors.Is(err,ErrProjectExists){t.Fatalf("duplicate conversion err=%v",err)}
  got,err:=svc.Get(ctx,p.ID);if err!=nil{t.Fatal(err)};if got.SourceNeedID!="verified"{t.Fatalf("source need=%s",got.SourceNeedID)}
  var roles,events int
  if err:=pool.QueryRow(ctx,"SELECT count(*) FROM project_roles WHERE project_id=$1",p.ID).Scan(&roles);err!=nil{t.Fatal(err)}
  if err:=pool.QueryRow(ctx,"SELECT count(*) FROM outbox_events WHERE aggregate_id=$1 AND event_type='project.created'",p.ID).Scan(&events);err!=nil{t.Fatal(err)}
  if roles!=1||events!=1{t.Fatalf("roles=%d events=%d",roles,events)}
  var projectID,sourceNeedID,createdBy string
  if err:=pool.QueryRow(ctx,`SELECT payload->>'projectId',payload->>'sourceNeedId',payload->>'createdBy' FROM outbox_events WHERE aggregate_id=$1 AND event_type='project.created'`,p.ID).Scan(&projectID,&sourceNeedID,&createdBy);err!=nil{t.Fatal(err)}
  if projectID!=p.ID||sourceNeedID!="verified"||createdBy!="person-1"{t.Fatalf("unexpected outbox lineage project=%s source=%s actor=%s",projectID,sourceNeedID,createdBy)}
}
