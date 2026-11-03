package needs

import (
	"errors"
	"math"
	"strings"
	"time"
	"unicode/utf8"
)

// LocationContext is a reporter/device claim, never an attestation or verification.
type LocationContext struct {
	Source         string   `json:"source"`
	CapturedAt     string   `json:"capturedAt,omitempty"`
	ConfirmedAt    string   `json:"confirmedAt"`
	AccuracyMeters *float64 `json:"accuracyMeters,omitempty"`
}

func ValidateReportContext(category, detail string, location *LocationContext) error {
	if (category == "other" && (strings.TrimSpace(detail) == "" || utf8.RuneCountInString(detail) > 120)) || (category != "other" && detail != "") {
		return errors.New("other category requires a description of 1–120 characters")
	}
	if location == nil {
		return nil
	} // Historical clients remain explicitly unproven.
	if location.Source != "device" && location.Source != "manual" {
		return errors.New("location source must be device or manual")
	}
	if _, err := time.Parse(time.RFC3339Nano, location.ConfirmedAt); err != nil {
		return errors.New("location confirmation time is required")
	}
	if location.CapturedAt != "" {
		if _, err := time.Parse(time.RFC3339Nano, location.CapturedAt); err != nil {
			return errors.New("invalid location capture time")
		}
	}
	if location.AccuracyMeters != nil && (math.IsNaN(*location.AccuracyMeters) || math.IsInf(*location.AccuracyMeters, 0) || *location.AccuracyMeters < 0) {
		return errors.New("invalid location accuracy")
	}
	if location.Source == "manual" && (location.CapturedAt != "" || location.AccuracyMeters != nil) {
		return errors.New("manual coordinates cannot claim device time or accuracy")
	}
	return nil
}
