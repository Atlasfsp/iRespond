package evidence

import "testing"

func TestCaptureIsBoundedClaimNotProof(t *testing.T) {
	lat, lng, seconds := 0.0, 3.4, 30.0
	good := CaptureContext{Origin: "camera", RecordedAt: "2026-11-03T08:00:00Z", Stage: "before", LocationStatus: "captured", Latitude: &lat, Longitude: &lng}
	if e := ValidateCapture(&good, "image/jpeg", 100); e != nil {
		t.Fatal(e)
	}
	for _, change := range []func(*CaptureContext){func(c *CaptureContext) { c.Origin = "verified" }, func(c *CaptureContext) { c.RecordedAt = "invalid" }, func(c *CaptureContext) { c.LocationStatus = "denied" }, func(c *CaptureContext) { c.Longitude = nil }, func(c *CaptureContext) { c.Stage = "certified" }} {
		bad := good
		change(&bad)
		if ValidateCapture(&bad, "image/jpeg", 100) == nil {
			t.Fatalf("invalid context accepted: %+v", bad)
		}
	}
	good.DurationSeconds = &seconds
	if ValidateCapture(&good, "video/mp4", 100) != nil {
		t.Fatal("valid video denied")
	}
	seconds = 31
	if ValidateCapture(&good, "video/mp4", 100) == nil {
		t.Fatal("long video accepted")
	}
}
