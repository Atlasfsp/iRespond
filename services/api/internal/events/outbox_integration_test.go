package events

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

type recordingPublisher struct{ subjects []string; ids []string }
func(p *recordingPublisher)Publish(_ context.Context,subject string,event Event)error{p.subjects=append(p.subjects,subject);p.ids=append(p.ids,event.ID);return nil}

func TestOutboxPublishesThenMarksAcknowledged(t *testing.T){
	db:=os.Getenv("TEST_DATABASE_URL");if db==""{t.Skip("TEST_DATABASE_URL is not set")};ctx:=context.Background();pool,err:=pgxpool.New(ctx,db);if err!=nil{t.Fatal(err)};defer pool.Close()
	body,err:=os.ReadFile(filepath.Join("..","..","migrations","0001_core.sql"));if err!=nil{t.Fatal(err)};if _,err=pool.Exec(ctx,string(body));err!=nil{t.Fatal(err)}
	if _,err=pool.Exec(ctx,`TRUNCATE outbox_events CASCADE`);err!=nil{t.Fatal(err)}
	if _,err=pool.Exec(ctx,`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES('evt-1','need','need-1','need.reported','{"id":"need-1"}')`);err!=nil{t.Fatal(err)}
	recorder:=&recordingPublisher{};outbox,err:=NewOutbox(ctx,db,"irespond.events",recorder);if err!=nil{t.Fatal(err)};defer outbox.Close()
	count,err:=outbox.Flush(ctx,10);if err!=nil{t.Fatal(err)};if count!=1{t.Fatalf("count=%d",count)};if len(recorder.subjects)!=1||recorder.subjects[0]!="irespond.events.need.reported"{t.Fatalf("subjects=%v",recorder.subjects)}
	var published bool;if err=pool.QueryRow(ctx,`SELECT published_at IS NOT NULL FROM outbox_events WHERE id='evt-1'`).Scan(&published);err!=nil{t.Fatal(err)};if !published{t.Fatal("event not marked published after publisher success")}
	count,err=outbox.Flush(ctx,10);if err!=nil{t.Fatal(err)};if count!=0{t.Fatalf("replayed acknowledged event count=%d",count)}
}
