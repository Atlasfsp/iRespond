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
	if rr.Code != http.StatusRequestEntityTooLarge { t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusRequestEntityTooLarge, rr.Body.String()) }
}

func TestGatewaySanitizesCorrelationAndPropagatesTrace(t *testing.T) {
	t.Setenv("REQUESTS_PER_MINUTE", "10")
	handler := gatewayMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	req := httptest.NewRequest(http.MethodGet, "/v1/platform", nil)
	req.Header.Set("X-Request-ID", "bad request id\n")
	req.Header.Set("traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent { t.Fatalf("status=%d", rr.Code) }
	if got := rr.Header().Get("X-Request-ID"); got == "" || strings.Contains(got, " ") { t.Fatalf("unsafe request id propagated: %q", got) }
	if got := rr.Header().Get("X-Trace-ID"); got != "4bf92f3577b34da6a3ce929d0e0e4736" { t.Fatalf("trace id=%q", got) }
	if rr.Header().Get("X-Content-Type-Options") != "nosniff" || rr.Header().Get("Cache-Control") != "no-store" { t.Fatal("expected gateway security headers") }
}

func TestGatewayRateLimitFailsClosed(t *testing.T) {
	t.Setenv("REQUESTS_PER_MINUTE", "1")
	handler := gatewayMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	first := httptest.NewRecorder(); handler.ServeHTTP(first, httptest.NewRequest(http.MethodGet, "/v1/platform", nil))
	second := httptest.NewRecorder(); handler.ServeHTTP(second, httptest.NewRequest(http.MethodGet, "/v1/platform", nil))
	if second.Code != http.StatusTooManyRequests { t.Fatalf("status=%d want=%d body=%s", second.Code, http.StatusTooManyRequests, second.Body.String()) }
	if second.Header().Get("Retry-After") == "" { t.Fatal("expected Retry-After header") }
}

func TestGatewayAllowsOnlyConfiguredWebOrigin(t *testing.T) {
	t.Setenv("WEB_ALLOWED_ORIGINS", "https://app.irespond.example,http://localhost:4173")
	called := false
	handler := gatewayMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true; w.WriteHeader(http.StatusNoContent) }))
	req := httptest.NewRequest(http.MethodGet, "/v1/platform", nil)
	req.Header.Set("Origin", "https://app.irespond.example")
	rr := httptest.NewRecorder(); handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent || !called { t.Fatalf("status=%d called=%v body=%s", rr.Code, called, rr.Body.String()) }
	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "https://app.irespond.example" { t.Fatalf("allow origin=%q", got) }
	if got := rr.Header().Get("Access-Control-Allow-Credentials"); got != "" { t.Fatalf("credentialed CORS unexpectedly enabled: %q", got) }
	if !strings.Contains(rr.Header().Get("Vary"), "Origin") { t.Fatal("expected Vary: Origin") }
}

func TestGatewayCanonicalizesConfiguredWebOriginTrailingSlash(t *testing.T) {
	t.Setenv("WEB_ALLOWED_ORIGINS", "https://APP.iRespond.example:443/,http://LOCALHOST:80/")
	cfg := gatewayConfigFromEnvironment()
	if _, ok := cfg.AllowedWebOrigins["https://app.irespond.example"]; !ok { t.Fatalf("canonical origin missing: %#v", cfg.AllowedWebOrigins) }
	if _, ok := cfg.AllowedWebOrigins["http://localhost"]; !ok { t.Fatalf("canonical localhost origin missing: %#v", cfg.AllowedWebOrigins) }
	if len(cfg.AllowedWebOrigins) != 2 { t.Fatalf("non-browser origins retained: %#v", cfg.AllowedWebOrigins) }
	handler := gatewayMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	req := httptest.NewRequest(http.MethodGet, "/v1/platform", nil); req.Header.Set("Origin", "https://app.irespond.example")
	rr := httptest.NewRecorder(); handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent { t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String()) }
}

func TestGatewayRejectsUnconfiguredWebOrigin(t *testing.T) {
	t.Setenv("WEB_ALLOWED_ORIGINS", "https://app.irespond.example")
	called := false
	handler := gatewayMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true; w.WriteHeader(http.StatusNoContent) }))
	req := httptest.NewRequest(http.MethodGet, "/v1/platform", nil); req.Header.Set("Origin", "https://evil.example")
	rr := httptest.NewRecorder(); handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden { t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String()) }
	if called { t.Fatal("disallowed origin reached application handler") }
	if rr.Header().Get("Access-Control-Allow-Origin") != "" { t.Fatal("disallowed origin was reflected") }
}

func TestGatewayHandlesAllowedCORSPreflightWithoutApplicationDispatch(t *testing.T) {
	t.Setenv("WEB_ALLOWED_ORIGINS", "https://app.irespond.example")
	called := false
	handler := gatewayMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true; w.WriteHeader(http.StatusNoContent) }))
	req := httptest.NewRequest(http.MethodOptions, "/v1/me/privacy/consents", nil)
	req.Header.Set("Origin", "https://app.irespond.example")
	req.Header.Set("Access-Control-Request-Method", "GET")
	req.Header.Set("Access-Control-Request-Headers", "authorization")
	rr := httptest.NewRecorder(); handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent { t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String()) }
	if called { t.Fatal("preflight reached application handler") }
	if !strings.Contains(rr.Header().Get("Access-Control-Allow-Headers"), "Authorization") { t.Fatalf("allowed headers=%q", rr.Header().Get("Access-Control-Allow-Headers")) }
}

func TestValidWebOriginRejectsWildcardPathQueryAndUnsafeScheme(t *testing.T) {
	for _, value := range []string{"*", "https://app.irespond.example/path", "https://app.irespond.example/?x=1", "ftp://app.irespond.example", "javascript:alert(1)"} {
		if validWebOrigin(value) { t.Fatalf("unsafe web origin accepted: %q", value) }
	}
	for _, value := range []string{"https://app.irespond.example", "http://localhost:4173"} {
		if !validWebOrigin(value) { t.Fatalf("safe web origin rejected: %q", value) }
	}
}

func TestTraceparentValidationRejectsMalformedOrZeroIDs(t *testing.T) {
	cases := []string{
		"00-00000000000000000000000000000000-00f067aa0ba902b7-01",
		"00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01",
		"ff-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
		"not-a-traceparent",
	}
	for _, value := range cases { if got := traceIDFromTraceparent(value); got != "" { t.Fatalf("traceparent %q accepted as %q", value, got) } }
}
