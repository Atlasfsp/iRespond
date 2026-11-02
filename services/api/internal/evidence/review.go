package evidence

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrReviewForbidden = errors.New("independent authenticated evidence reviewer required")
	ErrReviewConflict  = errors.New("review intent conflicts with recorded decision")
)

// Reviewer is server-supplied after OIDC verification, never decoded from JSON.
type Reviewer struct {
	Principal        auth.Principal
	IdempotencyKey   string
	PolicyDecisionID string
}

// Review keeps actorless legacy Go calls fail-closed. Existing HTTP clients need
// not change their decision payload; identity comes only from verified claims.
// The state, append-only audit and outbox event commit in one YSQL transaction.
func (s *Service) Review(ctx context.Context, evidenceID, decision string, identity ...Reviewer) (Record, error) {
	if len(identity) != 1 || !validReviewAuthority(identity[0]) {
		return Record{}, ErrReviewForbidden
	}
	actor := identity[0].Principal.Subject
	decision = strings.ToLower(strings.TrimSpace(decision))
	if decision != "available" && decision != "quarantined" && decision != "rejected" {
		return Record{}, ErrInvalidReview
	}
	key := identity[0].IdempotencyKey
	if key == "" {
		digest := sha256.Sum256([]byte(evidenceID + "\x00" + actor + "\x00" + decision))
		key = "legacy-" + hex.EncodeToString(digest[:])
	}
	if len(key) > 128 || strings.TrimSpace(key) == "" || strings.IndexFunc(key, func(r rune) bool { return r < 33 || r > 126 }) >= 0 {
		return Record{}, ErrInvalidReview
	}
	var last error
	for attempt := 0; attempt < 5; attempt++ {
		rec, err := s.reviewOnce(ctx, evidenceID, decision, actor, key, identity[0].Principal.TenantID, identity[0].PolicyDecisionID)
		var pgerr *pgconn.PgError
		if !errors.As(err, &pgerr) || (pgerr.Code != "40001" && pgerr.Code != "40P01") {
			return rec, err
		}
		last = err
		timer := time.NewTimer(time.Duration(attempt+1) * 5 * time.Millisecond)
		select {
		case <-ctx.Done():
			timer.Stop()
			return Record{}, ctx.Err()
		case <-timer.C:
		}
	}
	return Record{}, last
}

func (s *Service) reviewOnce(ctx context.Context, evidenceID, decision, actor, key, tenant, policyReceipt string) (Record, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return Record{}, err
	}
	defer tx.Rollback(ctx)
	var rec Record
	var uploader, reporter string
	err = tx.QueryRow(ctx, `SELECT e.id,e.need_id,e.content_type,e.size_bytes,COALESCE(e.sha256_hex,''),e.status,e.created_at,e.available_at,e.uploader_id,n.reporter_id FROM need_evidence e JOIN needs n ON n.id=e.need_id WHERE e.id=$1 FOR UPDATE OF e`, evidenceID).Scan(&rec.ID, &rec.NeedID, &rec.ContentType, &rec.SizeBytes, &rec.SHA256Hex, &rec.Status, &rec.CreatedAt, &rec.AvailableAt, &uploader, &reporter)
	if errors.Is(err, pgx.ErrNoRows) {
		return Record{}, ErrEvidenceNotFound
	}
	if err != nil {
		return Record{}, err
	}
	if actor == uploader || actor == reporter {
		return Record{}, ErrReviewForbidden
	}
	var previousActor, previousDecision, previousDigest, previousTenant string
	err = tx.QueryRow(ctx, `SELECT reviewer_id,decision,source_sha256_hex,COALESCE(tenant_id,'') FROM evidence_reviews WHERE evidence_id=$1 AND idempotency_key=$2`, evidenceID, key).Scan(&previousActor, &previousDecision, &previousDigest, &previousTenant)
	if err == nil {
		if previousTenant != tenant || previousActor != actor || previousDecision != decision || previousDigest != rec.SHA256Hex || rec.Status != decision {
			return Record{}, ErrReviewConflict
		}
		return rec, tx.Commit(ctx)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return Record{}, err
	}
	if rec.Status != "pending_review" {
		return Record{}, ErrEvidenceNotFound
	}
	if rec.SHA256Hex == "" || !validOptionalSHA256(rec.SHA256Hex) {
		return Record{}, ErrObjectMismatch
	}
	reviewID := newID()
	_, err = tx.Exec(ctx, `INSERT INTO evidence_reviews(id,evidence_id,reviewer_id,source_sha256_hex,from_status,decision,idempotency_key,tenant_id,policy_decision_id) VALUES($1,$2,$3,$4,'pending_review',$5,$6,$7,$8)`, reviewID, evidenceID, actor, rec.SHA256Hex, decision, key, tenant, policyReceipt)
	if err != nil {
		return Record{}, err
	}
	err = tx.QueryRow(ctx, `UPDATE need_evidence SET status=$2,available_at=CASE WHEN $2='available' THEN now() ELSE NULL END WHERE id=$1 RETURNING available_at`, evidenceID, decision).Scan(&rec.AvailableAt)
	if err != nil {
		return Record{}, err
	}
	payload, err := json.Marshal(map[string]string{"evidenceId": evidenceID, "reviewId": reviewID, "status": decision, "tenantId": tenant})
	if err != nil {
		return Record{}, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1,'need_evidence',$2,'evidence.reviewed',$3::jsonb)`, "evidence-review-"+reviewID, evidenceID, payload)
	if err != nil {
		return Record{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Record{}, err
	}
	rec.Status = decision
	return rec, nil
}

func validReviewAuthority(identity Reviewer) bool {
	return strings.TrimSpace(identity.Principal.Subject) != "" && auth.CanReviewEvidence(identity.Principal) && auth.ValidTenantID(identity.Principal.TenantID) && strings.TrimSpace(identity.PolicyDecisionID) != "" && len(identity.PolicyDecisionID) <= 512
}
