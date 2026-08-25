package impact

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestPassportUsesVerifiedRepositoryFacts(t *testing.T){databaseURL:=os.Getenv("TEST_DATABASE_URL");if databaseURL==""{t.Skip("TEST_DATABASE_URL is not set")};ctx:=context.Background();pool,err:=pgxpool.New(ctx,databaseURL);if err!=nil{t.Fatal(err)};defer pool.Close();for _,name:=range []string{"0001_core.sql","0003_projects.sql","0004_contribution_offers.sql","0005_project_governance.sql"}{b,err:=os.ReadFile(filepath.Join("..","..","migrations",name));if err!=nil{t.Fatal(err)};if _,err:=pool.Exec(ctx,string(b));err!=nil{t.Fatalf("apply %s: %v",name,err)}};if _,err:=pool.Exec(ctx,`TRUNCATE contribution_offers,contribution_needs,project_roles,project_milestones,action_projects,need_verifications,outbox_events,needs CASCADE`);err!=nil{t.Fatal(err)};_,err=pool.Exec(ctx,`INSERT INTO needs(id,title,description,verification_state,sdg_tags) VALUES('n-impact','School library','Restore library','community_confirmed','{4,10,17}');INSERT INTO action_projects(id,source_need_id,title,status,sdg_tags,created_by,project_manager_id) VALUES('p-impact','n-impact','Restore library','completed','{4,10,17}','user-1','user-1');INSERT INTO project_roles(project_id,actor_id,role) VALUES('p-impact','user-1','project_manager');INSERT INTO contribution_needs(id,project_id,kind,description) VALUES('cn-impact','p-impact','skill','Catalogue books');INSERT INTO contribution_offers(id,project_id,contribution_need_id,contributor_id,kind,status) VALUES('co-impact','p-impact','cn-impact','user-1','skill','fulfilled');INSERT INTO need_verifications(id,need_id,verifier_id,state) VALUES('nv-impact','n-impact','user-1','community_confirmed')`);if err!=nil{t.Fatal(err)};svc,err:=New(ctx,databaseURL);if err!=nil{t.Fatal(err)};defer svc.Close();p,err:=svc.Passport(ctx,"user-1");if err!=nil{t.Fatal(err)};if p.ProjectsLed!=1||p.ProjectsCompleted!=1||p.Verifications!=1||p.FulfilledContributions!=1{t.Fatalf("unexpected passport: %#v",p)};if len(p.SDGs)!=3||p.SDGs[0]!=4||p.SDGs[1]!=10||p.SDGs[2]!=17{t.Fatalf("unexpected SDGs: %#v",p.SDGs)};if len(p.Roles)!=1||p.Roles[0].Role!="project_manager"{t.Fatalf("unexpected roles: %#v",p.Roles)}}
