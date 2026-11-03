package main

import (
	"encoding/json"
	"github.com/Atlasfsp/iRespond/services/api/internal/needs"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReportCategoryAndLocationContext(t *testing.T) {
	for _, tc := range []struct {
		extra string
		code  int
	}{
		{`,"category":"other","categoryDetail":"Wildlife rescue","locationContext":{"source":"device","capturedAt":"2026-11-03T08:00:00Z","confirmedAt":"2026-11-03T08:00:02Z","accuracyMeters":12}`, 201},
		{`,"category":"other","categoryDetail":"  "`, 400},
		{`,"category":"other","categoryDetail":"` + strings.Repeat("x", 121) + `"`, 400},
		{`,"category":"health","categoryDetail":"misleading"`, 400},
		{`,"locationContext":{"source":"verified","confirmedAt":"2026-11-03T08:00:00Z"}`, 400},
		{`,"locationContext":{"source":"device","confirmedAt":"nonsense"}`, 400},
	} {
		r := httptest.NewRequest("POST", "/v1/needs", strings.NewReader(`{"title":"Synthetic","description":"Test only","latitude":0,"longitude":0`+tc.extra+`}`))
		w := httptest.NewRecorder()
		createNeedHandler(needs.NewMemoryRepository(), nil)(w, r)
		if w.Code != tc.code {
			t.Fatalf("%s status=%d body=%s", tc.extra, w.Code, w.Body.String())
		}
		if tc.code == 201 {
			var data map[string]any
			json.Unmarshal(w.Body.Bytes(), &data)
			if data["categoryDetail"] != "Wildlife rescue" || data["locationContext"] == nil {
				t.Fatalf("capture details lost: %s", w.Body.String())
			}
		}
	}
}

func TestMissingCoordinatesNeverDefaultToGulfOfGuinea(t *testing.T) {
	for _, body := range []string{`{"title":"Synthetic","description":"Test only"}`, `{"title":"Synthetic","description":"Test only","latitude":null,"longitude":0}`} {
		w := httptest.NewRecorder()
		createNeedHandler(needs.NewMemoryRepository(), nil)(w, httptest.NewRequest("POST", "/v1/needs", strings.NewReader(body)))
		if w.Code != 400 {
			t.Fatalf("missing coordinates accepted: %s", w.Body.String())
		}
	}
}

func TestNearbyRejectsNonFiniteCoordinates(t *testing.T) {
	for _, query := range []string{"lat=NaN&lng=0&radiusKm=1", "lat=0&lng=Inf&radiusKm=1", "lat=0&lng=0&radiusKm=NaN"} {
		w := httptest.NewRecorder()
		nearbyNeedsHandler(needs.NewMemoryRepository())(w, httptest.NewRequest("GET", "/v1/needs?"+query, nil))
		if w.Code != 400 {
			t.Fatalf("non-finite query accepted: %s", query)
		}
	}
}
