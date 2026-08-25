package projects

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestContributionCommitmentLifecycle(t *testing.T){
	dbURL:=os.Getenv("TEST_DATABASE_URL");if dbURL==""{t.Skip("database integration service not configured")};ctx:=context.Background();pool,err:=pgxpool.New(ctx,dbURL);if err!=nil{t.Fatal(err)};defer pool.Close()
	for _,name:=range []string{"0001_core.sql","0003_projects.sql","0004_contribution_offers.sql"}{b,err:=os.ReadFile(filepath.Join("..","..","migrations",name));if err!=nil{t.Fatal(err)};if _,err:=pool.Exec(ctx,string(b));err!=nil{t.Fatalf("apply %s: %v",name,err)}}
	if _,err:=pool.Exec(ctx,`TRUNCATE contribution_offers,contribution_needs,project_roles,project_milestones,action_projects,outbox_events,needs CASCADE`);err!=nil{t.Fatal(err)}
	if _,err:=pool.Exec(ctx,`INSERT INTO needs(id,title,description,category,reporter_id,verification_state,sdg_tags,latitude,longitude) VALUES('need-contrib','Community library','x','education','reporter','community_confirmed','{4}',6.53,3.38)`);err!=nil{t.Fatal(err)}
	m,err:=New(ctx,dbURL);if err!=nil{t.Fatal(err)};defer m.Close();p,err:=m.Convert(ctx,"project-contrib","need-contrib","","","community-1","steward-1");if err!=nil{t.Fatal(err)}
	need,err:=m.AddContributionNeed(ctx,"need-skill",p.ID,"skill","Electrical inspection","One licensed electrician");if err!=nil{t.Fatal(err)}
	o1,err:=m.OfferContribution(ctx,"offer-1",p.ID,need.ID,"person-1","I am a licensed electrician","Saturday morning");if err!=nil{t.Fatal(err)}
	o2,err:=m.OfferContribution(ctx,"offer-2",p.ID,need.ID,"person-2","Can assist","Sunday");if err!=nil{t.Fatal(err)}
	if _,err:=m.WithdrawContributionOffer(ctx,o2.ID,"person-2");err!=nil{t.Fatal(err)}
	accepted,err:=m.DecideContributionOffer(ctx,p.ID,o1.ID,"accepted","steward-1",true);if err!=nil{t.Fatal(err)};if accepted.Status!="accepted"{t.Fatalf("accepted status=%s",accepted.Status)}
	var needStatus string;if err:=pool.QueryRow(ctx,`SELECT status FROM contribution_needs WHERE id=$1`,need.ID).Scan(&needStatus);err!=nil{t.Fatal(err)};if needStatus!="filled"{t.Fatalf("need status=%s",needStatus)}
	fulfilled,err:=m.FulfillContributionOffer(ctx,p.ID,o1.ID,"steward-1");if err!=nil{t.Fatal(err)};if fulfilled.Status!="fulfilled"{t.Fatalf("fulfilled status=%s",fulfilled.Status)}
	mine,err:=m.ListContributorOffers(ctx,"person-1");if err!=nil{t.Fatal(err)};if len(mine)!=1||mine[0].Status!="fulfilled"{t.Fatalf("mine=%+v",mine)}
	all,err:=m.ListProjectOffers(ctx,p.ID);if err!=nil{t.Fatal(err)};if len(all)!=2{t.Fatalf("offers=%d",len(all))}
	var acceptedEvents,fulfilledEvents int;if err:=pool.QueryRow(ctx,`SELECT count(*) FROM outbox_events WHERE aggregate_id=$1 AND event_type='contribution.accepted'`,p.ID).Scan(&acceptedEvents);err!=nil{t.Fatal(err)};if err:=pool.QueryRow(ctx,`SELECT count(*) FROM outbox_events WHERE aggregate_id=$1 AND event_type='contribution.fulfilled'`,p.ID).Scan(&fulfilledEvents);err!=nil{t.Fatal(err)};if acceptedEvents!=1||fulfilledEvents!=1{t.Fatalf("accepted=%d fulfilled=%d",acceptedEvents,fulfilledEvents)}
}
