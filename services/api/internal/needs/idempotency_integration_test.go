package needs

import (
	"context"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func TestYSQLCreationIntentConcurrencyAndExpiry(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	migration, err := os.ReadFile(filepath.Join("..", "..", "migrations", "0001_core.sql"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = pool.Exec(ctx, string(migration)); err != nil {
		t.Fatal(err)
	}
	if _, err = pool.Exec(ctx, `TRUNCATE needs,need_verifications,idempotency_keys,outbox_events CASCADE`); err != nil {
		t.Fatal(err)
	}
	repo, err := NewPostgresRepository(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer repo.Close()
	original := Need{ID: "intent-original", Title: "Synthetic", Description: "No real pilot", ReporterID: "person-1", SDGTags: []int{6}, Latitude: 6.5, Longitude: 3.4}
	if _, _, err = repo.Create(ctx, original, "conflict-intent"); err != nil {
		t.Fatal(err)
	}
	changed := original
	changed.ID = "intent-changed"
	changed.ReporterID = "another-person"
	if _, _, err = repo.Create(ctx, changed, "conflict-intent"); !errors.Is(err, ErrIdempotencyConflict) {
		t.Errorf("changed intent returned %v", err)
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	ids := map[string]bool{}
	originalResponses := 0
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			n := original
			n.ID = fmt.Sprintf("concurrent-%d", i)
			created, replay, err := repo.Create(ctx, n, "concurrent-intent")
			if err != nil {
				t.Error(err)
				return
			}
			mu.Lock()
			ids[created.ID] = true
			if !replay {
				originalResponses++
			}
			mu.Unlock()
		}(i)
	}
	wg.Wait()
	if len(ids) != 1 || originalResponses != 1 {
		t.Errorf("concurrent intent produced %d IDs and %d originals", len(ids), originalResponses)
	}
	var eventCount int
	if err = pool.QueryRow(ctx, `SELECT count(*) FROM outbox_events WHERE aggregate_id LIKE 'concurrent-%'`).Scan(&eventCount); err != nil || eventCount != 1 {
		t.Errorf("concurrent outbox events=%d err=%v", eventCount, err)
	}
	if _, err = pool.Exec(ctx, `UPDATE idempotency_keys SET expires_at=now()-interval '1 second' WHERE scope='create_need' AND key='conflict-intent'`); err != nil {
		t.Fatal(err)
	}
	renewed := original
	renewed.ID = "renewed-after-expiry"
	renewed.Title = "New intent after expiry"
	created, replayed, err := repo.Create(ctx, renewed, "conflict-intent")
	if err != nil || replayed || created.ID != renewed.ID {
		t.Errorf("expired key renewal: id=%s replay=%v err=%v", created.ID, replayed, err)
	}
	omitted := original
	omitted.ID = "omitted-sdg-tags"
	omitted.SDGTags = nil
	if created, _, err := repo.Create(ctx, omitted, ""); err != nil || len(created.SDGTags) != 0 {
		t.Errorf("optional SDG tags: %v %v", created, err)
	}

}
