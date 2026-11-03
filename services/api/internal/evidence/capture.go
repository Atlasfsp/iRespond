package evidence

import (
	"encoding/json"
	"math"
	"time"
)

// CaptureContext is untrusted client-reported provenance. It is not certification.
type CaptureContext struct {
	Origin          string   `json:"origin"`
	RecordedAt      string   `json:"recordedAt"`
	Stage           string   `json:"stage"`
	LocationStatus  string   `json:"locationStatus"`
	Latitude        *float64 `json:"latitude,omitempty"`
	Longitude       *float64 `json:"longitude,omitempty"`
	AccuracyMeters  *float64 `json:"accuracyMeters,omitempty"`
	DurationSeconds *float64 `json:"durationSeconds,omitempty"`
}

func ValidateCapture(c *CaptureContext, contentType string, size int64) error {
	if c == nil {
		return nil
	} // Historical clients have unknown capture context.
	if c.Origin != "camera" && c.Origin != "library" && c.Origin != "legacy" {
		return ErrInvalidMedia
	}
	if c.Stage != "before" && c.Stage != "during" && c.Stage != "after" {
		return ErrInvalidMedia
	}
	if _, err := time.Parse(time.RFC3339Nano, c.RecordedAt); err != nil {
		return ErrInvalidMedia
	}
	if c.LocationStatus != "captured" && c.LocationStatus != "denied" && c.LocationStatus != "unavailable" {
		return ErrInvalidMedia
	}
	if c.LocationStatus == "captured" {
		if c.Latitude == nil || c.Longitude == nil || !finite(*c.Latitude) || !finite(*c.Longitude) || math.Abs(*c.Latitude) > 90 || math.Abs(*c.Longitude) > 180 {
			return ErrInvalidMedia
		}
	} else if c.Latitude != nil || c.Longitude != nil || c.AccuracyMeters != nil {
		return ErrInvalidMedia
	}
	if c.AccuracyMeters != nil && (!finite(*c.AccuracyMeters) || *c.AccuracyMeters < 0) {
		return ErrInvalidMedia
	}
	video := contentType == "video/mp4" || contentType == "video/quicktime"
	if video {
		if size > 25*1024*1024 || c.DurationSeconds == nil || !finite(*c.DurationSeconds) || *c.DurationSeconds <= 0 || *c.DurationSeconds > 30 {
			return ErrInvalidMedia
		}
	} else if size > 10*1024*1024 || c.DurationSeconds != nil {
		return ErrInvalidMedia
	}
	return nil
}
func finite(v float64) bool { return !math.IsNaN(v) && !math.IsInf(v, 0) }
func captureJSON(c *CaptureContext) []byte {
	if c == nil {
		return nil
	}
	b, _ := json.Marshal(c)
	return b
}
