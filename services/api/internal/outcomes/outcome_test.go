package outcomes

import (
	"strings"
	"testing"
	"time"
)

func sample() Record {
	return Record{TenantID: "ngo", ProjectID: "project", AuthorID: "author", Indicator: "Safe water access", Kind: "outcome", Unit: "households", Value: 12, MeasuredAt: time.Now().Add(-time.Hour), Method: "Household survey", Source: "Survey register", Caveats: "Sample only; causality unproven", Classification: "public", PublicationConsent: true, Evidence: []Evidence{{ID: "e", SHA256: strings.Repeat("a", 64), Approved: true}}, State: "submitted"}
}
func TestReviewRequiresTenantIndependentReviewerAndEvidence(t *testing.T) {
	r := sample()
	if err := r.Review("ngo", "reviewer", true, time.Now()); err != nil {
		t.Fatal(err)
	}
	if r.State != "approved" || r.ReviewerID != "reviewer" {
		t.Fatal("review missing")
	}
	for _, mutate := range []func(*Record){func(r *Record) { r.TenantID = "other" }, func(r *Record) { r.AuthorID = "reviewer" }, func(r *Record) { r.Evidence[0].Approved = false }, func(r *Record) { r.Value = 0.0 / variableZero() }, func(r *Record) { r.MeasuredAt = time.Now().Add(time.Hour) }} {
		q := sample()
		mutate(&q)
		if q.Review("ngo", "reviewer", true, time.Now()) == nil {
			t.Fatal("invalid review approved")
		}
	}
}
func variableZero() float64 { return 0 }
func TestPublicProjectionRedactsEvidenceAndBlocksPrivateOrDisputedClaims(t *testing.T) {
	r := sample()
	if _, ok := r.Public(); ok {
		t.Fatal("unreviewed claim published")
	}
	if err := r.Review("ngo", "reviewer", true, time.Now()); err != nil {
		t.Fatal(err)
	}
	p, ok := r.Public()
	if !ok || p.Kind != "outcome" || p.Caveats == "" {
		t.Fatal("approved claim missing limitations")
	}
	r.Classification = "restricted"
	if _, ok := r.Public(); ok {
		t.Fatal("private claim published")
	}
	r.Classification = "public"
	r.PublicationConsent = false
	if _, ok := r.Public(); ok {
		t.Fatal("unconsented publication")
	}
	r.PublicationConsent = true
	r.State = "disputed"
	if _, ok := r.Public(); ok {
		t.Fatal("disputed claim published")
	}
}
