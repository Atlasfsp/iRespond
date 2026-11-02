package main

import (
	"encoding/json"
	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

func TestEvidencePolicyUsesVerifiedScopeAndFreshDecisions(t *testing.T) {
	var revoked atomic.Bool
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		var body map[string]string
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		if r.URL.Path != "/api/v1/check" || body["Subject"] != "reviewer-1" || body["Class"] != "confidential" {
			t.Errorf("incorrect canonical policy request: %s %v", r.URL, body)
		}
		allowed := r.Header.Get("X-Tenant-Id") == "ngo/lagos" && body["Resource"] == "need_evidence:evidence-1" && (body["Action"] == "review" || body["Action"] == "read") && !revoked.Load()
		_ = json.NewEncoder(w).Encode(map[string]any{"allow": allowed, "decision_id": "synthetic-policy-receipt"})
	}))
	defer server.Close()
	policy := evidencePolicy{URL: server.URL}
	human := auth.Principal{Subject: "reviewer-1", ActorType: "human", TenantID: "ngo/lagos", Roles: map[string]struct{}{"trust_safety_admin": {}}}
	for _, tt := range []struct {
		name, tenant, resource, actor string
		status                        int
	}{
		{"scoped review", "ngo/lagos", "evidence-1", "human", 200},
		{"cross tenant admin denied", "ngo/other", "evidence-1", "human", 403},
		{"other resource denied", "ngo/lagos", "evidence-2", "human", 403},
		{"legacy tenantless denied", "", "evidence-1", "human", 403},
		{"invalid tenant denied", "NGO", "evidence-1", "human", 403},
		{"AI denied", "ngo/lagos", "evidence-1", "ai_employee", 403},
		{"service denied", "ngo/lagos", "evidence-1", "service", 403},
		{"resource syntax injection denied", "ngo/lagos", "evidence-1:other", "human", 403},
	} {
		t.Run(tt.name, func(t *testing.T) {
			p := human
			p.TenantID = tt.tenant
			p.ActorType = tt.actor
			req := httptest.NewRequest(http.MethodPost, "/review", nil)
			req.Header.Set("X-Tenant-Id", "ngo/lagos")
			req.Header.Set("X-Subject", "reviewer-1")
			rr := httptest.NewRecorder()
			_, allowed := policy.authorize(rr, req, p, "review", tt.resource)
			if allowed != (tt.status == 200) || rr.Code != tt.status {
				t.Fatalf("allowed=%v status=%d body=%s", allowed, rr.Code, rr.Body.String())
			}
		})
	}
	req := httptest.NewRequest(http.MethodGet, "/access", nil)
	req.Header.Set("X-Tenant-Id", "forged-tenant")
	rr := httptest.NewRecorder()
	if _, allowed := policy.authorize(rr, req, human, "read", "evidence-1"); !allowed {
		t.Fatal("forged header must not replace signed tenant")
	}
	revoked.Store(true)
	rr = httptest.NewRecorder()
	if _, allowed := policy.authorize(rr, req, human, "read", "evidence-1"); allowed || rr.Code != 403 {
		t.Fatal("revoked access must not replay earlier allow")
	}
	if requests.Load() != 5 {
		t.Fatalf("expected five fresh scoped policy requests, got %d", requests.Load())
	}
}

func TestEvidencePolicyUnavailableOrMalformedIsClosed(t *testing.T) {
	p := auth.Principal{Subject: "reviewer-1", ActorType: "human", TenantID: "ngo/lagos"}
	for _, body := range []string{`{"allow":true}`, `{"allow":true,"decision_id":" "}`, `{"allow":true,"decision_id":"x","unexpected":true}`, `{"allow":true,"decision_id":"x"} {}`} {
		t.Run(body, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(body)) }))
			defer server.Close()
			rr := httptest.NewRecorder()
			if _, allowed := (evidencePolicy{URL: server.URL}).authorize(rr, httptest.NewRequest(http.MethodGet, "/", nil), p, "read", "evidence-1"); allowed || rr.Code != 503 {
				t.Fatalf("malformed allow reached resource: %d", rr.Code)
			}
		})
	}
	rr := httptest.NewRecorder()
	if _, allowed := (evidencePolicy{}).authorize(rr, httptest.NewRequest(http.MethodGet, "/", nil), p, "read", "evidence-1"); allowed || rr.Code != 503 {
		t.Fatal("missing policy must fail closed")
	}
}
