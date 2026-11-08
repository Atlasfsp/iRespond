package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
)

type stubChallengeVerifier struct {
	principals map[string]auth.Principal
}

func (s stubChallengeVerifier) Verify(_ context.Context, token string) (auth.Principal, error) {
	p, ok := s.principals[token]
	if !ok {
		return auth.Principal{}, auth.ErrInvalidToken
	}
	return p, nil
}

func TestChallengeHTTPHandlersSecurityAndLifecycle(t *testing.T) {
	verifier := stubChallengeVerifier{
		principals: map[string]auth.Principal{
			"org1": {
				Subject:   "org-1",
				ActorType: "human",
				TenantID:  "tenant-za",
				Roles:     map[string]struct{}{"programme_owner": {}},
			},
			"org2": {
				Subject:   "org-2",
				ActorType: "human",
				TenantID:  "tenant-za",
				Roles:     map[string]struct{}{"institution_admin": {}},
			},
			"student": {
				Subject:   "student-1",
				ActorType: "human",
				TenantID:  "",
				Roles:     map[string]struct{}{"citizen": {}},
			},
			"ai": {
				Subject:   "ai-agent",
				ActorType: "ai_employee",
				TenantID:  "tenant-za",
				Roles:     map[string]struct{}{"programme_owner": {}},
			},
		},
	}

	mux := http.NewServeMux()
	cleanup := registerChallengeRoutes(mux, verifier)
	defer cleanup()

	doReq := func(method, path, token, idemKey string, body any) *httptest.ResponseRecorder {
		var buf bytes.Buffer
		if body != nil {
			_ = json.NewEncoder(&buf).Encode(body)
		}
		req := httptest.NewRequest(method, path, &buf)
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		if idemKey != "" {
			req.Header.Set("Idempotency-Key", idemKey)
		}
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}

	// 1. Unauthenticated POST /v1/challenges -> 401
	if rec := doReq("POST", "/v1/challenges", "", "k1", map[string]any{"title": "Test"}); rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unauthenticated POST /v1/challenges, got %d", rec.Code)
	}
	// 2. AI principal POST /v1/challenges -> 403
	if rec := doReq("POST", "/v1/challenges", "ai", "k2", map[string]any{"title": "Test"}); rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for AI principal POST /v1/challenges, got %d", rec.Code)
	}
	// 3. Organiser creates challenge -> 201
	rec := doReq("POST", "/v1/challenges", "org1", "k3", map[string]any{
		"title":       "Clean River Challenge",
		"description": "Restore local riverbanks",
		"mission":     "Community water stewardship",
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 on create challenge, got %d: %s", rec.Code, rec.Body.String())
	}
	var created map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	challengeID, _ := created["id"].(string)
	rulesSHA, _ := created["rulesSha256"].(string)
	if challengeID == "" || rulesSHA == "" {
		t.Fatalf("expected challenge id and rulesSha256, got %+v", created)
	}

	// 4. Early publish before 2 approvals -> 409
	if rec := doReq("POST", "/v1/challenges/"+challengeID+"/publish", "org1", "k4", map[string]any{}); rec.Code != http.StatusConflict {
		t.Fatalf("expected 409 on early publish, got %d", rec.Code)
	}

	// 5. Two distinct human approvals + publish -> 201
	if rec := doReq("POST", "/v1/challenges/"+challengeID+"/rule-approvals", "org1", "k5", map[string]any{"rulesSha256": rulesSHA, "decision": "approve"}); rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 on first rule approval, got %d", rec.Code)
	}
	if rec := doReq("POST", "/v1/challenges/"+challengeID+"/rule-approvals", "org2", "k6", map[string]any{"rulesSha256": rulesSHA, "decision": "approve"}); rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 on second rule approval, got %d", rec.Code)
	}
	if rec := doReq("POST", "/v1/challenges/"+challengeID+"/publish", "org1", "k7", map[string]any{}); rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 on publish after 2 approvals, got %d: %s", rec.Code, rec.Body.String())
	}

	// 6. Public GET /v1/challenges lists published challenge
	listRec := doReq("GET", "/v1/challenges", "", "", nil)
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected 200 on public GET /v1/challenges, got %d", listRec.Code)
	}
}
