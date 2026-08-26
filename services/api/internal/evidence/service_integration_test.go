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
	"testing"

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
	for _, name := range []string{"0001_core.sql", "0002_evidence.sql"} {
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
	record, err = svc.Review(ctx, upload.EvidenceID, "available")
	if err != nil {
		t.Fatal(err)
	}
	if record.Status != "available" {
		t.Fatalf("review status=%s", record.Status)
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
