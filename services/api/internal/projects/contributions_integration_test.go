package projects

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestContributionNeedAndOffer(t *testing.T){
	databaseURL:=os.Getenv("TEST_DATABASE_URL");if databaseURL==""{t.Skip("TEST_DATABASE_URL is not set")};ctx:=context.Background();pool,err:=pgxpool.New(ctx,databaseURL);if err!=nil{t.Fatal(err)};defer pool.Close()
	for _,name:=range []string{"0001_core.sql","0002_evidence.sql","0003_projects.sql","0004_contribution_offers.sql"}{b,err:=os.ReadFile(filepath.Join("..","..","migrations",name));if err!=nil{t.Fatal(err)};if _,err:=pool.Exec(ctx,string(b));err!=nil{t.Fatalf("apply %s: %v",name,err)}}
	if _,err:=pool.Exec(ctx,`TRUNCATE contribution_offers, contribution_needs, project_roles, project_milestones, action_projects, need_evidence, need_verifications, idempotency_keys, outbox_events, needs CASCADE`);err!=nil{t.Fatal(err)}
	_,err=pool.Exec(ctx,`INSERT INTO needs(id,title,description,reporter_id,verification_state,sdg_tags) VALUES('n1','School library','Books and lights needed','r1','community_confirmed','{4}'); INSERT INTO action_projects(id,source_need_id,title,description,owner_community_id,status,sdg_tags,created_by) VALUES('p1','n1','Restore library','Restore books and lighting','school-community','mobilising','{4}','steward')`);if err!=nil{t.Fatal(err)}
	manager,err:=New(ctx,databaseURL);if err!=nil{t.Fatal(err)};defer manager.Close()
	need,err:=manager.AddContributionNeed(ctx,"cn1","p1","skill","Volunteer electrician for lighting assessment","2 hours on site");if err!=nil{t.Fatal(err)};if need.Kind!="skill"||need.Status!="open"{t.Fatalf("unexpected contribution need: %#v",need)}
	offer,err:=manager.OfferContribution(ctx,"o1","p1","cn1","person-1","Licensed electrician; can inspect and advise","Saturday mornings");if err!=nil{t.Fatal(err)};if offer.Kind!="skill"||offer.Status!="offered"||offer.ContributorID!="person-1"{t.Fatalf("unexpected offer: %#v",offer)}
	var eventCount int;if err:=pool.QueryRow(ctx,`SELECT count(*) FROM outbox_events WHERE aggregate_id='p1' AND event_type='contribution.offered'`).Scan(&eventCount);err!=nil{t.Fatal(err)};if eventCount!=1{t.Fatalf("event count=%d",eventCount)}
	detail,err:=manager.Get(ctx,"p1");if err!=nil{t.Fatal(err)};if len(detail.ContributionNeeds)!=1||detail.ContributionNeeds[0].ID!="cn1"{t.Fatalf("detail contribution needs: %#v",detail.ContributionNeeds)}
}
