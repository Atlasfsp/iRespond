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
	actor := Reviewer{Principal: auth.Principal{Subject: "reviewer", Roles: map[string]struct{}{"evidence_reviewer": {}}}}
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
