package evidence

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestSignedUploadLifecycle(t *testing.T) {
	dbURL := os.Getenv("TEST_DATABASE_URL")
	endpoint := os.Getenv("TEST_OBJECT_STORAGE_ENDPOINT")
	if dbURL == "" || endpoint == "" {
		t.Skip("integration services not configured")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	for _, name := range []string{"0001_core.sql", "0002_evidence.sql", "0011_evidence_review_audit.sql"} {
		b, err := os.ReadFile(filepath.Join("..", "..", "migrations", name))
		if err != nil {
			t.Fatal(err)
		}
		if _, err := pool.Exec(ctx, string(b)); err != nil {
			t.Fatalf("apply %s: %v", name, err)
		}
	}
	if _, err := pool.Exec(ctx, `TRUNCATE need_evidence, need_verifications, idempotency_keys, outbox_events, needs CASCADE`); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO needs(id,title,description,category,reporter_id,verification_state,sdg_tags,latitude,longitude) VALUES('evidence-need','Blocked drain','Drain is blocked','sanitation','reporter','observed','{6}',6.52,3.37)`); err != nil {
		t.Fatal(err)
	}

	cfg := Config{DatabaseURL: dbURL, Endpoint: endpoint, AccessKey: "IRESPONDTEST", SecretKey: "irespond-test-secret-2026", Bucket: "irespond-evidence", Region: "us-east-1", Secure: false}
	svc, err := New(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer svc.Close()
	if err := svc.EnsureBucket(ctx); err != nil {
		t.Fatal(err)
	}

	if _, err := svc.Initiate(ctx, "evidence-need", "person-1", "image/jpeg", 10, "not-a-sha256"); !errors.Is(err, ErrInvalidMedia) {
		t.Fatalf("invalid checksum accepted: %v", err)
	}

	payload := []byte("evidence-bytes")
	expectedHash := sha256.Sum256(payload)
	expectedSHA := hex.EncodeToString(expectedHash[:])
	upload, err := svc.Initiate(ctx, "evidence-need", "person-1", "image/jpeg", int64(len(payload)), "")
	if err != nil {
		t.Fatal(err)
	}
	if status := putSigned(t, upload, payload); status < 200 || status >= 300 {
		t.Fatalf("upload status=%d", status)
	}
	record, err := svc.Complete(ctx, "evidence-need", upload.EvidenceID, "person-1")
	if err != nil {
		t.Fatal(err)
	}
	if record.Status != "pending_review" {
		t.Fatalf("status=%s", record.Status)
	}
	if record.SHA256Hex != expectedSHA {
		t.Fatalf("sha256=%s want=%s", record.SHA256Hex, expectedSHA)
	}

	// Generated evidence keys are immutable: a presigned upload URL may not be
	// replayed to replace bytes after completion.
	tampered := []byte("tampered-bytes")
	if len(tampered) != len(payload) {
		t.Fatalf("test invariant: tampered payload length differs")
	}
	if status := putSigned(t, upload, tampered); status >= 200 && status < 300 {
		t.Fatalf("signed upload URL allowed object overwrite, status=%d", status)
	}

	if _, err := svc.AccessURL(ctx, "evidence-need", upload.EvidenceID); !errors.Is(err, ErrEvidenceNotFound) {
		t.Fatalf("evidence became accessible before moderation: %v", err)
	}
	// An actorless internal call must never moderate evidence.
	if _, err := svc.Review(ctx, upload.EvidenceID, "available"); err == nil {
		t.Fatal("actorless review accepted; no authenticated reviewer separation")
	}
	for _, role := range []string{"evidence_reviewer", "community_verifier", "trust_safety_admin"} {
		for _, subject := range []string{"person-1", "reporter"} {
			if _, err := svc.Review(ctx, upload.EvidenceID, "available", Reviewer{Principal: auth.Principal{Subject: subject, Roles: map[string]struct{}{role: {}}}}); !errors.Is(err, ErrReviewForbidden) {
				t.Fatalf("conflicted reviewer %s allowed: %v", subject, err)
			}
		}
	}
	reviewer := Reviewer{Principal: auth.Principal{Subject: "independent-reviewer", Roles: map[string]struct{}{"evidence_reviewer": {}}}, IdempotencyKey: "review-intent-1"}
	record, err = svc.Review(ctx, upload.EvidenceID, "available", reviewer)
	if err != nil {
		t.Fatal(err)
	}
	if record.Status != "available" {
		t.Fatalf("review status=%s", record.Status)
	}

	// A lost response/retry cannot duplicate the audit or outbox transition.
	for i := 0; i < 2; i++ {
		if _, err := svc.Review(ctx, upload.EvidenceID, "available", reviewer); err != nil {
			t.Fatalf("idempotent retry: %v", err)
		}
	}
	if _, err := svc.Review(ctx, upload.EvidenceID, "rejected", reviewer); !errors.Is(err, ErrReviewConflict) {
		t.Fatalf("intent reuse accepted: %v", err)
	}
	var audits, events int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM evidence_reviews WHERE evidence_id=$1`, upload.EvidenceID).Scan(&audits); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM outbox_events WHERE aggregate_id=$1 AND event_type='evidence.reviewed'`, upload.EvidenceID).Scan(&events); err != nil {
		t.Fatal(err)
	}
	if audits != 1 || events != 1 {
		t.Fatalf("duplicate review effects: audit=%d event=%d", audits, events)
	}
	var auditDigest, actor string
	if err := pool.QueryRow(ctx, `SELECT source_sha256_hex,reviewer_id FROM evidence_reviews WHERE evidence_id=$1`, upload.EvidenceID).Scan(&auditDigest, &actor); err != nil {
		t.Fatal(err)
	}
	if auditDigest != expectedSHA || actor != "independent-reviewer" {
		t.Fatalf("unbound review %s %s", auditDigest, actor)
	}
	if _, err := pool.Exec(ctx, `UPDATE evidence_reviews SET reviewer_id='forged' WHERE evidence_id=$1`, upload.EvidenceID); err == nil {
		t.Fatal("audit overwrite allowed")
	}
	if _, err := pool.Exec(ctx, `DELETE FROM evidence_reviews WHERE evidence_id=$1`, upload.EvidenceID); err == nil {
		t.Fatal("audit deletion allowed")
	}
	if _, err := pool.Exec(ctx, `UPDATE need_evidence SET sha256_hex=$2 WHERE id=$1`, upload.EvidenceID, strings.Repeat("0", 64)); err == nil {
		t.Fatal("completed digest mutation allowed")
	}
	if _, err := pool.Exec(ctx, `UPDATE need_evidence SET object_key='replacement' WHERE id=$1`, upload.EvidenceID); err == nil {
		t.Fatal("source object relinking allowed")
	}
	access, err := svc.AccessURL(ctx, "evidence-need", upload.EvidenceID)
	if err != nil {
		t.Fatal(err)
	}
	get, err := http.Get(access)
	if err != nil {
		t.Fatal(err)
	}
	defer get.Body.Close()
	body, _ := io.ReadAll(get.Body)
	if !bytes.Equal(body, payload) {
		t.Fatalf("download mismatch: %q", body)
	}

	newPending := func() string {
		t.Helper()
		u, err := svc.Initiate(ctx, "evidence-need", "person-1", "image/jpeg", int64(len(payload)), "")
		if err != nil {
			t.Fatal(err)
		}
		if status := putSigned(t, u, payload); status < 200 || status >= 300 {
			t.Fatalf("fixture PUT: %d", status)
		}
		if _, err := svc.Complete(ctx, "evidence-need", u.EvidenceID, "person-1"); err != nil {
			t.Fatal(err)
		}
		return u.EvidenceID
	}
	t.Run("concurrent duplicate review", func(t *testing.T) {
		id := newPending()
		var wg sync.WaitGroup
		results := make(chan error, 6)
		for i := 0; i < 6; i++ {
			wg.Add(1)
			go func() { defer wg.Done(); _, err := svc.Review(ctx, id, "available", reviewer); results <- err }()
		}
		wg.Wait()
		close(results)
		for err := range results {
			if err != nil {
				t.Fatalf("concurrent retry: %v", err)
			}
		}
		var count int
		if err := pool.QueryRow(ctx, `SELECT count(*) FROM evidence_reviews WHERE evidence_id=$1`, id).Scan(&count); err != nil || count != 1 {
			t.Fatalf("concurrent audit count=%d error=%v", count, err)
		}
		if err := pool.QueryRow(ctx, `SELECT count(*) FROM outbox_events WHERE aggregate_id=$1 AND event_type='evidence.reviewed'`, id).Scan(&count); err != nil || count != 1 {
			t.Fatalf("concurrent event count=%d error=%v", count, err)
		}
	})
	t.Run("outbox failure rolls back decision and audit", func(t *testing.T) {
		id := newPending()
		if _, err := pool.Exec(ctx, `CREATE OR REPLACE FUNCTION test_deny_evidence_outbox() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'injected outbox failure'; END; $$ LANGUAGE plpgsql;
   CREATE TRIGGER test_deny_evidence_outbox BEFORE INSERT ON outbox_events FOR EACH ROW WHEN (NEW.event_type='evidence.reviewed') EXECUTE FUNCTION test_deny_evidence_outbox()`); err != nil {
			t.Fatal(err)
		}
		defer func() {
			if _, err := pool.Exec(ctx, `DROP TRIGGER IF EXISTS test_deny_evidence_outbox ON outbox_events; DROP FUNCTION IF EXISTS test_deny_evidence_outbox()`); err != nil {
				t.Error(err)
			}
		}()
		if _, err := svc.Review(ctx, id, "available", reviewer); err == nil {
			t.Fatal("decision committed despite outbox failure")
		}
		var state string
		var count int
		if err := pool.QueryRow(ctx, `SELECT status FROM need_evidence WHERE id=$1`, id).Scan(&state); err != nil || state != "pending_review" {
			t.Fatalf("partial decision: %s %v", state, err)
		}
		if err := pool.QueryRow(ctx, `SELECT count(*) FROM evidence_reviews WHERE evidence_id=$1`, id).Scan(&count); err != nil || count != 0 {
			t.Fatalf("partial audit: %d %v", count, err)
		}
	})
	// A client-declared digest must match the bytes stored by RustFS. Failure is
	// fail-closed and leaves the upload outside moderation.
	mismatchPayload := []byte("checksum-mismatch")
	mismatch, err := svc.Initiate(ctx, "evidence-need", "person-1", "image/png", int64(len(mismatchPayload)), strings.Repeat("0", 64))
	if err != nil {
		t.Fatal(err)
	}
	if status := putSigned(t, mismatch, mismatchPayload); status < 200 || status >= 300 {
		t.Fatalf("mismatch upload status=%d", status)
	}
	if _, err := svc.Complete(ctx, "evidence-need", mismatch.EvidenceID, "person-1"); !errors.Is(err, ErrObjectMismatch) {
		t.Fatalf("checksum mismatch not rejected: %v", err)
	}
	var mismatchStatus string
	if err := pool.QueryRow(ctx, `SELECT status FROM need_evidence WHERE id=$1`, mismatch.EvidenceID).Scan(&mismatchStatus); err != nil {
		t.Fatal(err)
	}
	if mismatchStatus != "pending_upload" {
		t.Fatalf("checksum mismatch advanced status=%s", mismatchStatus)
	}
}

func putSigned(t *testing.T, upload InitiatedUpload, payload []byte) int {
	t.Helper()
	req, err := http.NewRequest(upload.Method, upload.UploadURL, bytes.NewReader(payload))
	if err != nil {
		t.Fatal(err)
	}
	for k, v := range upload.Headers {
		req.Header.Set(k, v)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	return resp.StatusCode
}
