package needs

import (
	"context"
	"errors"
	"testing"
)

func TestReporterCannotConfirmTheirOwnNeed(t *testing.T) {
	ctx := context.Background()
	repo := NewMemoryRepository()
	defer repo.Close()
	n, _, err := repo.Create(ctx, Need{ID: "self-review", Title: "Synthetic observation", ReporterID: "reporter"}, "")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = repo.Transition(ctx, n.ID, VerificationRequested, "reporter"); err != nil {
		t.Fatal(err)
	}
	if _, err = repo.Transition(ctx, n.ID, CommunityConfirmed, "reporter"); !errors.Is(err, ErrIndependentVerifierRequired) {
		t.Errorf("reporter confirmation returned %v", err)
	}
	confirmed, err := repo.Transition(ctx, n.ID, CommunityConfirmed, "independent-reviewer")
	if err != nil || confirmed.VerificationState != CommunityConfirmed {
		t.Fatalf("independent confirmation failed: %v %v", confirmed, err)
	}
	for _, state := range []VerificationState{IndependentlyAudited, GovernmentConfirmed, Rejected} {
		if _, err = repo.Transition(ctx, n.ID, state, "reporter"); err == nil {
			t.Errorf("reporter performed their own %s", state)
		}
	}
	current, err := repo.Get(ctx, n.ID)
	if err != nil || current.VerificationState != CommunityConfirmed {
		t.Fatalf("rejected decisions changed state: %v %v", current, err)
	}
}
