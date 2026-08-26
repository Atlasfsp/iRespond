package funding

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestFundingLifecycle(t *testing.T){
	url:=os.Getenv("TEST_DATABASE_URL");if url==""{t.Skip("TEST_DATABASE_URL is not set")};ctx:=context.Background();pool,err:=pgxpool.New(ctx,url);if err!=nil{t.Fatal(err)};defer pool.Close()
	for _,name:=range []string{"0001_core.sql","0003_projects.sql","0008_funding.sql"}{body,err:=os.ReadFile(filepath.Join("..","..","migrations",name));if err!=nil{t.Fatal(err)};if _,err=pool.Exec(ctx,string(body));err!=nil{t.Fatalf("apply %s: %v",name,err)}}
	_,_=pool.Exec(ctx,`TRUNCATE funding_pledges,project_funding_plans,project_roles,project_milestones,contribution_needs,action_projects,need_verifications,idempotency_keys,outbox_events,needs CASCADE`)
	_,err=pool.Exec(ctx,`INSERT INTO needs(id,title,description,verification_state) VALUES('n-fund','Water repair','Broken pump','community_confirmed')`);if err!=nil{t.Fatal(err)}
	_,err=pool.Exec(ctx,`INSERT INTO action_projects(id,source_need_id,title,created_by,status) VALUES('p-fund','n-fund','Restore water point','manager-1','approved')`);if err!=nil{t.Fatal(err)}
	svc,err:=New(ctx,url);if err!=nil{t.Fatal(err)};defer svc.Close()
	plan,err:=svc.UpsertPlan(ctx,"p-fund","NGN",1_000_000,250_000,"manager-1");if err!=nil{t.Fatal(err)};if plan.ExternalTargetMinor!=750_000{t.Fatalf("external target=%d",plan.ExternalTargetMinor)}
	pledge,err:=svc.CreatePledge(ctx,"p-fund","resident-1","community_counterpart",100_000);if err!=nil{t.Fatal(err)};if pledge.Status!="pledged"{t.Fatalf("pledge status=%s",pledge.Status)}
	plan,err=svc.Plan(ctx,"p-fund");if err!=nil{t.Fatal(err)};if plan.PledgedMinor!=100_000||plan.ConfirmedMinor!=0{t.Fatalf("summary pledged=%d confirmed=%d",plan.PledgedMinor,plan.ConfirmedMinor)}
	cancelled,err:=svc.CancelPledge(ctx,pledge.ID,"resident-1");if err!=nil{t.Fatal(err)};if cancelled.Status!="cancelled"{t.Fatalf("cancel status=%s",cancelled.Status)}
	var events int;if err=pool.QueryRow(ctx,`SELECT count(*) FROM outbox_events WHERE aggregate_type IN ('project_funding','funding_pledge')`).Scan(&events);err!=nil{t.Fatal(err)};if events!=3{t.Fatalf("funding events=%d",events)}
}
