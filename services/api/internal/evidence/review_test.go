package evidence

import (
	"context"
	"errors"
	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	"testing"
)

func TestReviewRejectsUnverifiedAuthorityBeforeDatabase(t *testing.T) {
	s := &Service{}
	for _, reviewers := range [][]Reviewer{nil, {{}}, {{Principal: auth.Principal{Subject: "person"}}}, {{Principal: auth.Principal{Subject: " ", Roles: map[string]struct{}{"evidence_reviewer": {}}}}}} {
		if _, err := s.Review(context.Background(), "evidence", "available", reviewers...); !errors.Is(err, ErrReviewForbidden) {
			t.Fatalf("unverified authority accepted: %v", err)
		}
	}
}
func TestReviewRejectsInvalidIntentBeforeDatabase(t *testing.T) {
	s := &Service{}
	actor := Reviewer{PolicyDecisionID: "synthetic-unit-receipt", Principal: auth.Principal{Subject: "reviewer", TenantID: "ngo/lagos", Roles: map[string]struct{}{"evidence_reviewer": {}}}}
	if _, err := s.Review(context.Background(), "evidence", "verified_true", actor); !errors.Is(err, ErrInvalidReview) {
		t.Fatalf("invented truth state: %v", err)
	}
	for _, key := range []string{" ", "a\nb", string(make([]byte, 129))} {
		actor.IdempotencyKey = key
		if _, err := s.Review(context.Background(), "evidence", "available", actor); !errors.Is(err, ErrInvalidReview) {
			t.Fatalf("invalid key accepted: %v", err)
		}
	}
}

func TestReviewRequiresScopedPolicyReceiptBeforeDatabaseAccess(t *testing.T) {
	for _, tt := range []struct{ tenant, receipt string }{{"", "synthetic-receipt"}, {"ngo/lagos", ""}, {"ngo/lagos", " "}} {
		t.Run(tt.tenant+"/"+tt.receipt, func(t *testing.T) {
			defer func() {
				if value := recover(); value != nil {
					t.Errorf("review reached persistence without scope/receipt: %v", value)
				}
			}()
			principal := auth.Principal{Subject: "reviewer", ActorType: "human", TenantID: tt.tenant, Roles: map[string]struct{}{"evidence_reviewer": {}}}
			_, err := (&Service{}).Review(context.Background(), "evidence-1", "available", Reviewer{Principal: principal, PolicyDecisionID: tt.receipt})
			if !errors.Is(err, ErrReviewForbidden) {
				t.Fatalf("missing scoped policy receipt returned %v", err)
			}
		})
	}
}

func TestAccessURLRequiresScopedAuthorityBeforeDatabaseAccess(t *testing.T) {
	if _, err := (&Service{}).AccessURL(context.Background(), "need", "evidence"); !errors.Is(err, ErrReviewForbidden) {
		t.Fatalf("actorless signed access: %v", err)
	}
}
