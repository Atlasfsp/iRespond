package main

import (
	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	"github.com/Atlasfsp/iRespond/services/api/internal/platform/authz"
	"net/http"
	"strings"
)

type evidencePolicy struct {
	URL  string
	HTTP *http.Client
}

// Only signed identity supplies tenant/subject; neither headers, JSON nor global
// admin roles grant resource scope. A missing live policy is a denial, not fallback.
func (p evidencePolicy) authorize(w http.ResponseWriter, r *http.Request, principal auth.Principal, action, id string) (string, bool) {
	if !principal.IsHuman() || !auth.ValidTenantID(principal.TenantID) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "verified human tenant identity required"})
		return "", false
	}
	if (action != "review" && action != "read") || !evidenceResourceID(id) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "evidence resource is not authorized"})
		return "", false
	}
	if strings.TrimSpace(p.URL) == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "evidence resource policy is not configured"})
		return "", false
	}
	client := authz.New(p.URL, principal.TenantID)
	client.HTTP = p.HTTP
	decision, err := client.Check(r.Context(), principal.Subject, action, "need_evidence:"+id, "confidential")
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "evidence resource policy is unavailable"})
		return "", false
	}
	if len(decision.DecisionID) > 512 {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "invalid policy receipt"})
		return "", false
	}
	if !decision.Allow {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "evidence resource policy denied access"})
		return "", false
	}
	return decision.DecisionID, true
}
func evidenceResourceID(id string) bool {
	if len(id) == 0 || len(id) > 128 {
		return false
	}
	for _, r := range id {
		if !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '-' || r == '_') {
			return false
		}
	}
	return true
}
