package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGatewayRejectsOversizedDeclaredBody(t *testing.T) {
	t.Setenv("MAX_REQUEST_BODY_BYTES", "8")
	handler := gatewayMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	req := httptest.NewRequest(http.MethodPost, "/v1/needs", strings.NewReader("0123456789"))
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusRequestEntityTooLarge, rr.Body.String())
	}
}

func TestGatewaySanitizesCorrelationAndPropagatesTrace(t *testing.T) {
	t.Setenv("REQUESTS_PER_MINUTE", "10")
	handler := gatewayMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	req := httptest.NewRequest(http.MethodGet, "/v1/platform", nil)
	req.Header.Set("X-Request-ID", "bad request id\n")
	req.Header.Set("traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("status=%d", rr.Code)
	}
	if got := rr.Header().Get("X-Request-ID"); got == "" || strings.Contains(got, " ") {
		t.Fatalf("unsafe request id propagated: %q", got)
	}
	if got := rr.Header().Get("X-Trace-ID"); got != "4bf92f3577b34da6a3ce929d0e0e4736" {
		t.Fatalf("trace id=%q", got)
	}
	if rr.Header().Get("X-Content-Type-Options") != "nosniff" || rr.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("expected gateway security headers")
	}
}

func TestGatewayRateLimitFailsClosed(t *testing.T) {
	t.Setenv("REQUESTS_PER_MINUTE", "1")
	handler := gatewayMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	first := httptest.NewRecorder()
	handler.ServeHTTP(first, httptest.NewRequest(http.MethodGet, "/v1/platform", nil))
	second := httptest.NewRecorder()
	handler.ServeHTTP(second, httptest.NewRequest(http.MethodGet, "/v1/platform", nil))
	if second.Code != http.StatusTooManyRequests {
		t.Fatalf("status=%d want=%d body=%s", second.Code, http.StatusTooManyRequests, second.Body.String())
	}
	if second.Header().Get("Retry-After") == "" {
		t.Fatal("expected Retry-After header")
	}
}

func TestTraceparentValidationRejectsMalformedOrZeroIDs(t *testing.T) {
	cases := []string{
		"00-00000000000000000000000000000000-00f067aa0ba902b7-01",
		"00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01",
		"ff-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
		"not-a-traceparent",
	}
	for _, value := range cases {
		if got := traceIDFromTraceparent(value); got != "" {
			t.Fatalf("traceparent %q accepted as %q", value, got)
		}
	}
}
