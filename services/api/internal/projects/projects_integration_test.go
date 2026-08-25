package projects

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestNeedToProjectConversion(t *testing.T) {
	databaseURL:=os.Getenv("TEST_DATABASE_URL");if databaseURL==""{t.Skip("TEST_DATABASE_URL is not set")}
	ctx:=context.Background();pool,err:=pgxpool.New(ctx,databaseURL);if err!=nil{t.Fatal(err)};defer pool.Close()
	for _,name:=range []string{"0001_core.sql","0002_evidence.sql","0003_projects.sql"}{b,err:=os.ReadFile(filepath.Join("..","..","migrations",name));if err!=nil{t.Fatal(err)};if _,err:=pool.Exec(ctx,string(b));err!=nil{t.Fatalf("apply %s: %v",name,err)}}
	if _,err:=pool.Exec(ctx,`TRUNCATE contribution_needs, project_roles, project_milestones, action_projects, need_evidence, need_verifications, idempotency_keys, outbox_events, needs CASCADE`);err!=nil{t.Fatal(err)}
	_,err=pool.Exec(ctx,`INSERT INTO needs(id,title,description,category,reporter_id,verification_state,sdg_tags,latitude,longitude) VALUES
('unverified','Broken drainage','Drainage blocks road','sanitation','r1','observed','{6,11}',6.52,3.37),
('verified','Repair water point','Pump has failed','water','r2','community_confirmed','{6}',6.53,3.38)`);if err!=nil{t.Fatal(err)}
	manager,err:=New(ctx,databaseURL);if err!=nil{t.Fatal(err)};defer manager.Close()
	if _,err:=manager.Convert(ctx,"p-unverified","unverified","","","community-1","steward-1");!errors.Is(err,ErrNeedNotVerified){t.Fatalf("expected ErrNeedNotVerified, got %v",err)}
	created,err:=manager.Convert(ctx,"p-1","verified","","","community-1","steward-1");if err!=nil{t.Fatal(err)}
	if created.SourceNeedID!="verified"||created.Status!="draft"||created.Title!="Repair water point"{t.Fatalf("unexpected project: %#v",created)}
	if _,err:=manager.Convert(ctx,"p-2","verified","","","community-1","steward-2");!errors.Is(err,ErrAlreadyConverted){t.Fatalf("expected duplicate conversion rejection, got %v",err)}
	var roleCount,eventCount int
	if err:=pool.QueryRow(ctx,`SELECT count(*) FROM project_roles WHERE project_id='p-1' AND actor_id='steward-1' AND role='community_steward'`).Scan(&roleCount);err!=nil{t.Fatal(err)}
	if roleCount!=1{t.Fatalf("role count=%d",roleCount)}
	if err:=pool.QueryRow(ctx,`SELECT count(*) FROM outbox_events WHERE aggregate_type='action_project' AND aggregate_id='p-1' AND event_type='project.created'`).Scan(&eventCount);err!=nil{t.Fatal(err)}
	if eventCount!=1{t.Fatalf("event count=%d",eventCount)}
	detail,err:=manager.Get(ctx,"p-1");if err!=nil{t.Fatal(err)};if detail.Project.ID!="p-1"||len(detail.Milestones)!=0||len(detail.ContributionNeeds)!=0{t.Fatalf("unexpected detail: %#v",detail)}
}
