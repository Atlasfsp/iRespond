package notifications

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSendIntentUsesTenantIdempotencyAndBearer(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/intents" { t.Fatalf("path=%s", r.URL.Path) }
		if got := r.Header.Get("X-Tenant-Id"); got != "irespond" { t.Fatalf("tenant=%q", got) }
		if got := r.Header.Get("Idempotency-Key"); got != "intent-1" { t.Fatalf("idempotency=%q", got) }
		if got := r.Header.Get("Authorization"); got != "Bearer service-token" { t.Fatalf("auth=%q", got) }
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte(`{"id":"msg-1","status":"sent"}`))
	}))
	defer server.Close()
	c := New(server.URL, "irespond", "service-token")
	out, err := c.SendIntent(context.Background(), Intent{Recipient:"user-1",Template:"project-update",Sender:"irespond",Class:"transactional"}, "intent-1")
	if err != nil { t.Fatal(err) }
	if out.ID != "msg-1" || out.Status != "sent" { t.Fatalf("unexpected delivery: %+v", out) }
}

func TestSendIntentFailsClosedWhenUnconfigured(t *testing.T) {
	if _, err := New("", "", "").SendIntent(context.Background(), Intent{Recipient:"u",Template:"t"}, "k"); err == nil { t.Fatal("expected configuration error") }
}
