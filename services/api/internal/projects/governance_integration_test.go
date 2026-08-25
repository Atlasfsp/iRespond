package projects

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestGovernedProjectLifecycle(t *testing.T){
	dbURL:=os.Getenv("TEST_DATABASE_URL");if dbURL==""{t.Skip("database integration service not configured")};ctx:=context.Background();pool,err:=pgxpool.New(ctx,dbURL);if err!=nil{t.Fatal(err)};defer pool.Close()
	for _,name:=range []string{"0001_core.sql","0003_projects.sql","0005_project_governance.sql"}{b,err:=os.ReadFile(filepath.Join("..","..","migrations",name));if err!=nil{t.Fatal(err)};if _,err:=pool.Exec(ctx,string(b));err!=nil{t.Fatalf("apply %s: %v",name,err)}}
	if _,err:=pool.Exec(ctx,`TRUNCATE milestone_status_history,project_status_history,project_role_invites,project_roles,project_milestones,contribution_needs,action_projects,outbox_events,needs CASCADE`);err!=nil{t.Fatal(err)}
	if _,err:=pool.Exec(ctx,`INSERT INTO needs(id,title,description,category,reporter_id,verification_state,sdg_tags,location) VALUES('need-gov','Repair school roof','x','education','reporter','community_confirmed','{4,11}',ST_SetSRID(ST_MakePoint(3.38,6.53),4326)::geography)`);err!=nil{t.Fatal(err)}
	m,err:=New(ctx,dbURL);if err!=nil{t.Fatal(err)};defer m.Close();p,err:=m.Convert(ctx,"project-gov","need-gov","","","community-1","steward-1");if err!=nil{t.Fatal(err)}
	if _,err:=m.TransitionProject(ctx,p.ID,"approved","steward-1");err==nil{t.Fatal("approval should require manager and milestone")}
	invite,err:=m.InviteRole(ctx,"invite-manager",p.ID,"manager-1","project_manager","steward-1");if err!=nil{t.Fatal(err)};if invite.Status!="pending"{t.Fatalf("invite=%+v",invite)}
	if _,err:=m.AcceptRole(ctx,invite.ID,"wrong-actor");!errors.Is(err,ErrRoleInviteNotFound){t.Fatalf("wrong actor accept err=%v",err)}
	if _,err:=m.AcceptRole(ctx,invite.ID,"manager-1");err!=nil{t.Fatal(err)}
	ms,err:=m.AddMilestone(ctx,"milestone-1",p.ID,"Repair and certify roof","",1,nil);if err!=nil{t.Fatal(err)}
	if _,err:=m.TransitionProject(ctx,p.ID,"approved","steward-1");err!=nil{t.Fatal(err)}
	if _,err:=m.TransitionProject(ctx,p.ID,"mobilising","manager-1");err!=nil{t.Fatal(err)}
	if _,err:=m.TransitionProject(ctx,p.ID,"executing","manager-1");err!=nil{t.Fatal(err)}
	for _,state:=range []string{"ready","in_progress","submitted"}{ms,err=m.TransitionMilestone(ctx,p.ID,ms.ID,state,"manager-1",false);if err!=nil{t.Fatalf("milestone %s: %v",state,err)}}
	if _,err:=m.TransitionMilestone(ctx,p.ID,ms.ID,"validated","manager-1",false);!errors.Is(err,ErrInvalidMilestoneTransition){t.Fatalf("manager validation err=%v",err)}
	if _,err:=m.TransitionProject(ctx,p.ID,"validating","manager-1");err!=nil{t.Fatal(err)}
	if _,err:=m.TransitionMilestone(ctx,p.ID,ms.ID,"validated","verifier-1",true);err!=nil{t.Fatal(err)}
	if _,err:=m.TransitionProject(ctx,p.ID,"maintaining","manager-1");err!=nil{t.Fatal(err)}
	if _,err:=m.TransitionProject(ctx,p.ID,"completed","manager-1");err==nil{t.Fatal("completion should require maintenance owner")}
	maint,err:=m.InviteRole(ctx,"invite-maint",p.ID,"maint-1","maintenance_owner","steward-1");if err!=nil{t.Fatal(err)};if _,err:=m.AcceptRole(ctx,maint.ID,"maint-1");err!=nil{t.Fatal(err)}
	completed,err:=m.TransitionProject(ctx,p.ID,"completed","manager-1");if err!=nil{t.Fatal(err)};if completed.Status!="completed"{t.Fatalf("status=%s",completed.Status)}
	var projectHistory,milestoneHistory int;if err:=pool.QueryRow(ctx,`SELECT count(*) FROM project_status_history WHERE project_id=$1`,p.ID).Scan(&projectHistory);err!=nil{t.Fatal(err)};if err:=pool.QueryRow(ctx,`SELECT count(*) FROM milestone_status_history WHERE project_id=$1`,p.ID).Scan(&milestoneHistory);err!=nil{t.Fatal(err)};if projectHistory!=6||milestoneHistory!=4{t.Fatalf("projectHistory=%d milestoneHistory=%d",projectHistory,milestoneHistory)}
}
