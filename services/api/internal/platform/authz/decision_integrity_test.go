package authz

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
)

func TestDecisionRequiresCompleteSingleBoundedReceipt(t *testing.T) {
	for name, body := range map[string]string{
		"missing receipt":      `{"allow":true}`,
		"blank receipt":        `{"allow":true,"decision_id":" "}`,
		"unknown policy field": `{"allow":true,"decision_id":"receipt","auto_grant":true}`,
		"second decision":      `{"allow":true,"decision_id":"receipt"}{"allow":false}`,
		"oversized":            `{"allow":true,"decision_id":"receipt","reason":"` + strings.Repeat("x", 33000) + `"}`,
	} {
		t.Run(name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(body)) }))
			defer srv.Close()
			d, err := New(srv.URL, "tenant").Check(context.Background(), "reviewer", "evidence.review", "need_evidence:id", "restricted")
			if err == nil || d.Allow {
				t.Fatalf("untrusted receipt authorized: allow=%v err=%v", d.Allow, err)
			}
		})
	}
}

func TestPolicyRedirectCannotProvideAuthorization(t *testing.T) {
	var targetCalls atomic.Int32
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		targetCalls.Add(1)
		_, _ = w.Write([]byte(`{"allow":true,"decision_id":"forged"}`))
	}))
	defer target.Close()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, target.URL, http.StatusTemporaryRedirect)
	}))
	defer srv.Close()
	d, err := New(srv.URL, "tenant").Check(context.Background(), "reviewer", "evidence.review", "need_evidence:id", "restricted")
	if err == nil || d.Allow || targetCalls.Load() != 0 {
		t.Fatalf("redirect accepted: calls=%d allow=%v err=%v", targetCalls.Load(), d.Allow, err)
	}
}

func TestEachPolicyCheckReevaluatesRevocation(t *testing.T) {
	seen := map[string]bool{}
	var revoked atomic.Bool
	var mu sync.Mutex
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		key := r.Header.Get("Idempotency-Key")
		// A stable key could replay an old allow at an idempotency-aware gateway.
		allow := !revoked.Load() || seen[key]
		seen[key] = true
		if allow {
			_, _ = w.Write([]byte(`{"allow":true,"decision_id":"allow-receipt"}`))
		} else {
			_, _ = w.Write([]byte(`{"allow":false,"decision_id":"deny-receipt"}`))
		}
	}))
	defer srv.Close()
	c := New(srv.URL, "tenant")
	if d, err := c.Check(context.Background(), "reviewer", "evidence.review", "need_evidence:id", ""); err != nil || !d.Allow {
		t.Fatalf("initial: %+v %v", d, err)
	}
	revoked.Store(true)
	if d, err := c.Check(context.Background(), "reviewer", "evidence.review", "need_evidence:id", ""); err != nil || d.Allow {
		t.Fatalf("revoked policy replayed old allow: %+v %v", d, err)
	}
}
