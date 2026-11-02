// Package outcomes defines human-reviewed measurements separately from activity.
// Persistence and product exposure require the tenant-authorized Hasura contract.
package outcomes

import (
	"errors"
	"math"
	"regexp"
	"strings"
	"time"
)

type Evidence struct {
	ID, SHA256 string
	Approved   bool
}
type Record struct {
	TenantID, ProjectID, AuthorID string
	Indicator, Kind, Unit         string
	Value                         float64
	MeasuredAt                    time.Time
	Method, Source, Caveats       string
	Classification                string
	PublicationConsent            bool
	Evidence                      []Evidence
	State, ReviewerID             string
	ReviewedAt                    time.Time
}

// PublicMeasurement deliberately excludes evidence IDs, subjects and location.
type PublicMeasurement struct {
	ProjectID, Indicator, Kind, Unit string
	Value                            float64
	MeasuredAt                       time.Time
	Method, Source, Caveats          string
}

var hashPattern = regexp.MustCompile(`^[a-fA-F0-9]{64}$`)

func (r Record) validate(now time.Time) error {
	for _, s := range []string{r.TenantID, r.ProjectID, r.AuthorID, r.Indicator, r.Unit, r.Method, r.Source, r.Caveats} {
		if strings.TrimSpace(s) == "" {
			return errors.New("measurement context and limitations required")
		}
	}
	if r.Kind != "output" && r.Kind != "outcome" && r.Kind != "maintenance" {
		return errors.New("invalid measurement kind")
	}
	if math.IsNaN(r.Value) || math.IsInf(r.Value, 0) || r.MeasuredAt.IsZero() || r.MeasuredAt.After(now) {
		return errors.New("invalid measurement")
	}
	if len(r.Evidence) == 0 {
		return errors.New("evidence required")
	}
	for _, e := range r.Evidence {
		if e.ID == "" || !hashPattern.MatchString(e.SHA256) || !e.Approved {
			return errors.New("approved hashed evidence required")
		}
	}
	switch r.Classification {
	case "public", "internal", "restricted", "safeguarded":
	default:
		return errors.New("classification required")
	}
	return nil
}

// Review requires a caller already authorized by SpiceDB for this tenant/project.
// Neither client roles nor AI proposals may provide that authority.
func (r *Record) Review(tenant, reviewer string, approve bool, now time.Time) error {
	if tenant == "" || tenant != r.TenantID || reviewer == "" || reviewer == r.AuthorID {
		return errors.New("independent tenant reviewer required")
	}
	if r.State != "submitted" && r.State != "under_review" {
		return errors.New("record is not awaiting review")
	}
	if err := r.validate(now); err != nil {
		return err
	}
	r.State = "rejected"
	if approve {
		r.State = "approved"
	}
	r.ReviewerID = reviewer
	r.ReviewedAt = now.UTC()
	return nil
}
func (r Record) Public() (PublicMeasurement, bool) {
	if r.State != "approved" || r.Classification != "public" || !r.PublicationConsent || r.ReviewerID == "" || r.ReviewerID == r.AuthorID || r.ReviewedAt.IsZero() || r.validate(r.ReviewedAt) != nil {
		return PublicMeasurement{}, false
	}
	return PublicMeasurement{r.ProjectID, r.Indicator, r.Kind, r.Unit, r.Value, r.MeasuredAt, r.Method, r.Source, r.Caveats}, true
}
