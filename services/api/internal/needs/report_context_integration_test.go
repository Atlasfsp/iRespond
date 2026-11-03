package needs

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"path/filepath"
	"testing"
)

func TestYSQLFieldReportContextRoundTrip(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	for _, name := range []string{"0001_core.sql", "0002_evidence.sql", "0013_field_report_context.sql"} {
		b, e := os.ReadFile(filepath.Join("..", "..", "migrations", name))
		if e != nil {
			t.Fatal(e)
		}
		if _, e = pool.Exec(ctx, string(b)); e != nil {
			t.Fatal(e)
		}
	}
	repo, err := NewPostgresRepository(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer repo.Close()
	accuracy := 12.0
	n := Need{ID: "field-context-roundtrip", Title: "Synthetic rescue", Description: "No real pilot", Category: "other", CategoryDetail: "Wildlife rescue", LocationContext: &LocationContext{Source: "device", CapturedAt: "2026-11-03T08:00:00Z", ConfirmedAt: "2026-11-03T08:00:02Z", AccuracyMeters: &accuracy}}
	_, err = pool.Exec(ctx, `DELETE FROM idempotency_keys WHERE key='field-context-intent'`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = pool.Exec(ctx, `DELETE FROM needs WHERE id=$1`, n.ID)
	if err != nil {
		t.Fatal(err)
	}
	created, _, err := repo.Create(ctx, n, "field-context-intent")
	if err != nil {
		t.Fatal(err)
	}
	got, err := repo.Get(ctx, created.ID)
	if err != nil || !sameCreationIntent(got, n) {
		t.Fatalf("context lost: %+v %v", got, err)
	}
	if !got.LocationKnown {
		t.Fatal("explicit zero coordinates became unknown")
	}
	if _, e := pool.Exec(ctx, `UPDATE idempotency_keys SET response_body=response_body - 'locationKnown' WHERE key='field-context-intent'`); e != nil {
		t.Fatal(e)
	}
	replay, wasReplay, e := repo.Create(ctx, n, "field-context-intent")
	if e != nil || !wasReplay || !replay.LocationKnown {
		t.Fatalf("historical receipt lost known coordinates: %+v %v", replay, e)
	}
	if _, e := pool.Exec(ctx, `INSERT INTO needs(id,title,description,category,reporter_id,sdg_tags,latitude,longitude) VALUES('field-legacy-location','Synthetic legacy','No captured destination','community','','{}',NULL,NULL) ON CONFLICT (id) DO UPDATE SET latitude=NULL,longitude=NULL`); e != nil {
		t.Fatal(e)
	}
	legacy, e := repo.Get(ctx, "field-legacy-location")
	if e != nil || legacy.LocationKnown {
		t.Fatalf("unknown coordinates presented as known: %+v %v", legacy, e)
	}

	n.CategoryDetail = "Different intent"
	if _, _, e := repo.Create(ctx, n, "field-context-intent"); !errors.Is(e, ErrIdempotencyConflict) {
		t.Fatalf("changed detail accepted: %v", e)
	}
	var leaked int
	if e := pool.QueryRow(ctx, `SELECT count(*) FROM outbox_events WHERE aggregate_id=$1 AND payload->'locationContext' IS NOT NULL`, n.ID).Scan(&leaked); e != nil || leaked != 0 {
		t.Fatalf("private capture context in outbox: %d %v", leaked, e)
	}
}
