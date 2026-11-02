package main

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	"github.com/Atlasfsp/iRespond/services/api/internal/needs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type needIdentity struct{ principal auth.Principal }

func (v needIdentity) Verify(_ context.Context, token string) (auth.Principal, error) {
	if token != "valid-token" {
		return auth.Principal{}, errors.New("invalid token")
	}
	return v.principal, nil
}
func TestNeedReporterMustComeFromVerifiedIdentity(t *testing.T) {
	for _, tt := range []struct {
		name, authorization, actorType, wantReporter string
		status                                       int
	}{
		{"anonymous cannot impersonate", "", "", "", 201},
		{"authenticated reporter overrides JSON", "Bearer valid-token", "human", "verified-person", 201},
		{"invalid bearer never falls back to anonymous", "Bearer invalid", "human", "", 401},
		{"AI identity cannot publish a need", "Bearer valid-token", "ai_employee", "", 403},
		{"service identity cannot publish a need", "Bearer valid-token", "service", "", 403},
	} {
		t.Run(tt.name, func(t *testing.T) {
			repo := needs.NewMemoryRepository()
			defer repo.Close()
			verifier := needIdentity{principal: auth.Principal{Subject: "verified-person", ActorType: tt.actorType}}
			req := httptest.NewRequest(http.MethodPost, "/v1/needs", strings.NewReader(`{"title":"Synthetic observation","description":"Unit test only","latitude":6.5,"longitude":3.4,"reporterId":"impersonated-person"}`))
			if tt.authorization != "" {
				req.Header.Set("Authorization", tt.authorization)
			}
			rr := httptest.NewRecorder()
			createNeedHandler(repo, verifier).ServeHTTP(rr, req)
			if rr.Code != tt.status {
				t.Fatalf("status=%d want=%d body=%s", rr.Code, tt.status, rr.Body.String())
			}
			if rr.Code == 201 {
				var created needs.Need
				if err := json.Unmarshal(rr.Body.Bytes(), &created); err != nil {
					t.Fatal(err)
				}
				if created.ReporterID != tt.wantReporter {
					t.Fatalf("reporter=%q want %q", created.ReporterID, tt.wantReporter)
				}
			} else {
				items, err := repo.Nearby(context.Background(), 6.5, 3.4, 1)
				if err != nil || len(items) != 0 {
					t.Fatalf("denied request persisted data: %v %v", items, err)
				}
			}
		})
	}
}

func TestNeedRetryKeysCannotReplayAnotherReporter(t *testing.T) {
	repo := needs.NewMemoryRepository()
	defer repo.Close()
	var ids []string
	for _, subject := range []string{"person-a", "person-b"} {
		req := httptest.NewRequest(http.MethodPost, "/v1/needs", strings.NewReader(`{"title":"Synthetic","description":"Test only","latitude":6.5,"longitude":3.4}`))
		req.Header.Set("Authorization", "Bearer valid-token")
		req.Header.Set("Idempotency-Key", "shared-client-key")
		rr := httptest.NewRecorder()
		createNeedHandler(repo, needIdentity{principal: auth.Principal{Subject: subject, ActorType: "human"}}).ServeHTTP(rr, req)
		if rr.Code != 201 {
			t.Fatalf("subject=%s status=%d body=%s", subject, rr.Code, rr.Body.String())
		}
		var n needs.Need
		if err := json.Unmarshal(rr.Body.Bytes(), &n); err != nil {
			t.Fatal(err)
		}
		if n.ReporterID != subject {
			t.Fatalf("subject=%s replayed reporter=%s", subject, n.ReporterID)
		}
		ids = append(ids, n.ID)
	}
	if ids[0] == ids[1] {
		t.Fatal("another reporter's idempotency response was disclosed")
	}
}

func TestPublicNeedReadDoesNotExposeVerifiedReporterIdentity(t *testing.T) {
	repo := needs.NewMemoryRepository()
	defer repo.Close()
	ctx := context.Background()
	secretSubject := "private-oidc-subject-123"
	n, _, err := repo.Create(ctx, needs.Need{ID: "public-observation", Title: "Synthetic observation", Description: "Test only", ReporterID: secretSubject, Latitude: 6.5, Longitude: 3.4}, "")
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/needs/{id}", getNeedHandler(repo))
	mux.HandleFunc("GET /v1/needs", nearbyNeedsHandler(repo))
	for _, url := range []string{"/v1/needs/" + n.ID, "/v1/needs?lat=6.5&lng=3.4&radiusKm=1"} {
		rr := httptest.NewRecorder()
		mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, url, nil))
		if rr.Code != 200 {
			t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
		}
		if strings.Contains(rr.Body.String(), secretSubject) {
			t.Errorf("public route %s disclosed verified reporter identity", url)
		}
	}
	stored, err := repo.Get(ctx, n.ID)
	if err != nil || stored.ReporterID != secretSubject {
		t.Fatal("privacy projection changed authoritative attribution")
	}
}
