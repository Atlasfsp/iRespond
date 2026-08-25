package needs

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestPostgresRepositoryLifecycle(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil { t.Fatal(err) }
	defer pool.Close()

	migrationPath := filepath.Join("..", "..", "migrations", "0001_core.sql")
	migration, err := os.ReadFile(migrationPath)
	if err != nil { t.Fatalf("read migration: %v", err) }
	if _, err := pool.Exec(ctx, string(migration)); err != nil { t.Fatalf("apply migration: %v", err) }
	if _, err := pool.Exec(ctx, `TRUNCATE need_verifications, idempotency_keys, outbox_events, needs CASCADE`); err != nil { t.Fatal(err) }

	repo, err := NewPostgresRepository(ctx, databaseURL)
	if err != nil { t.Fatal(err) }
	defer repo.Close()

	need := Need{ID:"integration-need-1",Title:"Repair community water point",Description:"Pump is not working",Category:"water",Latitude:6.5244,Longitude:3.3792,ReporterID:"reporter-1",SDGTags:[]int{6}}
	created, replayed, err := repo.Create(ctx, need, "integration-key-1")
	if err != nil { t.Fatal(err) }
	if replayed { t.Fatal("first create unexpectedly replayed") }
	if created.VerificationState != Observed { t.Fatalf("state=%s", created.VerificationState) }

	replayedNeed, replayed, err := repo.Create(ctx, Need{ID:"different-generated-id",Title:need.Title,Description:need.Description,Category:need.Category,Latitude:need.Latitude,Longitude:need.Longitude,ReporterID:need.ReporterID,SDGTags:need.SDGTags}, "integration-key-1")
	if err != nil { t.Fatal(err) }
	if !replayed || replayedNeed.ID != created.ID { t.Fatalf("idempotency replay failed: replayed=%v id=%s", replayed, replayedNeed.ID) }

	nearby, err := repo.Nearby(ctx, 6.5244, 3.3792, 2)
	if err != nil { t.Fatal(err) }
	if len(nearby) != 1 || nearby[0].ID != created.ID { t.Fatalf("nearby=%v", nearby) }
	far, err := repo.Nearby(ctx, 9.0765, 7.3986, 2)
	if err != nil { t.Fatal(err) }
	if len(far) != 0 { t.Fatalf("expected no distant needs, got %d", len(far)) }

	requested, err := repo.Transition(ctx, created.ID, VerificationRequested, "verifier-1")
	if err != nil { t.Fatal(err) }
	if requested.VerificationState != VerificationRequested { t.Fatalf("state=%s", requested.VerificationState) }
	confirmed, err := repo.Transition(ctx, created.ID, CommunityConfirmed, "verifier-2")
	if err != nil { t.Fatal(err) }
	if confirmed.VerificationState != CommunityConfirmed { t.Fatalf("state=%s", confirmed.VerificationState) }

	var verificationCount int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM need_verifications WHERE need_id=$1`, created.ID).Scan(&verificationCount); err != nil { t.Fatal(err) }
	if verificationCount != 2 { t.Fatalf("verification history count=%d", verificationCount) }
	var outboxCount int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM outbox_events WHERE aggregate_id=$1`, created.ID).Scan(&outboxCount); err != nil { t.Fatal(err) }
	if outboxCount != 3 { t.Fatalf("outbox count=%d", outboxCount) }
}
