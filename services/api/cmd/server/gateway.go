package main

import (
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

type gatewayConfig struct {
	MaxBodyBytes int64
	RequestsPerMinute int
	AllowedWebOrigins map[string]struct{}
}

func gatewayConfigFromEnvironment() gatewayConfig {
	cfg := gatewayConfig{MaxBodyBytes: 1 << 20, RequestsPerMinute: 240, AllowedWebOrigins: map[string]struct{}{}}
	if value, err := strconv.ParseInt(strings.TrimSpace(os.Getenv("MAX_REQUEST_BODY_BYTES")), 10, 64); err == nil && value > 0 { cfg.MaxBodyBytes = value }
	if value, err := strconv.Atoi(strings.TrimSpace(os.Getenv("REQUESTS_PER_MINUTE"))); err == nil && value > 0 { cfg.RequestsPerMinute = value }
	for _, raw := range strings.Split(os.Getenv("WEB_ALLOWED_ORIGINS"), ",") {
		if origin, ok := normalizeWebOrigin(raw); ok { cfg.AllowedWebOrigins[origin] = struct{}{} }
	}
	return cfg
}

func normalizeWebOrigin(origin string) (string, bool) {
	origin = strings.TrimSpace(origin)
	if origin == "" || origin == "*" { return "", false }
	parsed, err := url.Parse(origin)
	if err != nil { return "", false }
	scheme := strings.ToLower(parsed.Scheme)
	if (scheme != "https" && scheme != "http") || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" { return "", false }
	if parsed.Path != "" && parsed.Path != "/" { return "", false }
	hostname, port := strings.ToLower(parsed.Hostname()), parsed.Port()
	if hostname == "" { return "", false }
	if (scheme == "https" && port == "443") || (scheme == "http" && port == "80") { port = "" }
	host := hostname
	if port != "" { host = net.JoinHostPort(hostname, port) } else if strings.Contains(hostname, ":") { host = "[" + hostname + "]" }
	return scheme + "://" + host, true
}
func validWebOrigin(origin string) bool { _, ok := normalizeWebOrigin(origin); return ok }

func applyWebCORS(w http.ResponseWriter, r *http.Request, allowed map[string]struct{}) bool {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" { return true }
	if _, ok := allowed[origin]; !ok { return false }
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Add("Vary", "Origin")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key, X-Request-ID, traceparent")
	w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID, X-Trace-ID, Idempotent-Replay, Retry-After")
	w.Header().Set("Access-Control-Max-Age", "600")
	return true
}

type windowCounter struct { Count int; Reset time.Time }
type clientRateLimiter struct { mu sync.Mutex; limit int; clients map[string]windowCounter }
func newClientRateLimiter(limit int) *clientRateLimiter { return &clientRateLimiter{limit: limit, clients: make(map[string]windowCounter)} }
func (l *clientRateLimiter) allow(client string, now time.Time) (bool, int) {
	l.mu.Lock(); defer l.mu.Unlock(); window := l.clients[client]
	if window.Reset.IsZero() || !now.Before(window.Reset) { window = windowCounter{Reset: now.Add(time.Minute)} }
	if window.Count >= l.limit { return false, max(1, int(time.Until(window.Reset).Seconds())) }
	window.Count++; l.clients[client] = window; return true, 0
}

type responseCapture struct { http.ResponseWriter; status int }
func (w *responseCapture) WriteHeader(status int) { if w.status == 0 { w.status = status }; w.ResponseWriter.WriteHeader(status) }
func (w *responseCapture) Write(body []byte) (int, error) { if w.status == 0 { w.WriteHeader(http.StatusOK) }; return w.ResponseWriter.Write(body) }

type requestMetric struct { Method string; Route string; StatusClass string; Count uint64; DurationSeconds float64 }
type requestMetrics struct { mu sync.Mutex; values map[string]requestMetric }
func newRequestMetrics() *requestMetrics { return &requestMetrics{values: make(map[string]requestMetric)} }
func (m *requestMetrics) observe(method, route string, status int, duration time.Duration) {
	if route == "" { route = "unmatched" }; class := fmt.Sprintf("%dxx", status/100); key := method + "\x00" + route + "\x00" + class
	m.mu.Lock(); metric := m.values[key]; metric.Method, metric.Route, metric.StatusClass = method, route, class; metric.Count++; metric.DurationSeconds += duration.Seconds(); m.values[key] = metric; m.mu.Unlock()
}
func (m *requestMetrics) writePrometheus(w http.ResponseWriter) {
	m.mu.Lock(); values := make([]requestMetric, 0, len(m.values)); for _, metric := range m.values { values = append(values, metric) }; m.mu.Unlock()
	_, _ = fmt.Fprint(w, "# HELP irespond_http_requests_total HTTP requests by method, route pattern, and status class.\n# TYPE irespond_http_requests_total counter\n")
	for _, metric := range values { _, _ = fmt.Fprintf(w, "irespond_http_requests_total{method=%s,route=%s,status_class=%s} %d\n", prometheusQuote(metric.Method), prometheusQuote(metric.Route), prometheusQuote(metric.StatusClass), metric.Count) }
	_, _ = fmt.Fprint(w, "# HELP irespond_http_request_duration_seconds_sum Cumulative HTTP request duration by method and route pattern.\n# TYPE irespond_http_request_duration_seconds_sum counter\n")
	for _, metric := range values { _, _ = fmt.Fprintf(w, "irespond_http_request_duration_seconds_sum{method=%s,route=%s,status_class=%s} %.6f\n", prometheusQuote(metric.Method), prometheusQuote(metric.Route), prometheusQuote(metric.StatusClass), metric.DurationSeconds) }
}

var gatewayRequestMetrics = newRequestMetrics()

func gatewayMiddleware(next http.Handler) http.Handler {
	cfg := gatewayConfigFromEnvironment(); limiter := newClientRateLimiter(cfg.RequestsPerMinute)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now(); capture := &responseCapture{ResponseWriter: w}
		requestID := validCorrelationID(r.Header.Get("X-Request-ID")); if requestID == "" { requestID = newID() }
		traceID := traceIDFromTraceparent(r.Header.Get("traceparent")); if traceID == "" { traceID = newTraceID() }
		capture.Header().Set("X-Request-ID", requestID); capture.Header().Set("X-Trace-ID", traceID); capture.Header().Set("X-Content-Type-Options", "nosniff"); capture.Header().Set("Referrer-Policy", "no-referrer"); capture.Header().Set("Cache-Control", "no-store")

		if !applyWebCORS(capture, r, cfg.AllowedWebOrigins) {
			writeJSON(capture, http.StatusForbidden, map[string]string{"error": "web origin is not allowed"})
			gatewayRequestMetrics.observe(r.Method, "gateway/cors", capture.status, time.Since(started)); return
		}
		if r.Method == http.MethodOptions {
			capture.WriteHeader(http.StatusNoContent); gatewayRequestMetrics.observe(r.Method, "gateway/cors-preflight", capture.status, time.Since(started)); return
		}
		if r.ContentLength > cfg.MaxBodyBytes && r.ContentLength >= 0 {
			writeJSON(capture, http.StatusRequestEntityTooLarge, map[string]string{"error": "request body exceeds configured limit"}); gatewayRequestMetrics.observe(r.Method, "gateway/body-limit", capture.status, time.Since(started)); return
		}
		if r.Body != nil { r.Body = http.MaxBytesReader(capture, r.Body, cfg.MaxBodyBytes) }
		if !gatewayExemptPath(r.URL.Path) {
			allowed, retryAfter := limiter.allow(remoteClient(r.RemoteAddr), time.Now())
			if !allowed { capture.Header().Set("Retry-After", strconv.Itoa(retryAfter)); writeJSON(capture, http.StatusTooManyRequests, map[string]string{"error": "request rate limit exceeded"}); gatewayRequestMetrics.observe(r.Method, "gateway/rate-limit", capture.status, time.Since(started)); return }
		}
		next.ServeHTTP(capture, r); if capture.status == 0 { capture.status = http.StatusOK }; gatewayRequestMetrics.observe(r.Method, r.Pattern, capture.status, time.Since(started))
	})
}

func gatewayExemptPath(path string) bool { switch path { case "/livez", "/readyz", "/healthz", "/metrics", "/version": return true; default: return false } }
func remoteClient(remoteAddr string) string { host, _, err := net.SplitHostPort(remoteAddr); if err == nil && host != "" { return host }; if remoteAddr == "" { return "unknown" }; return remoteAddr }
func validCorrelationID(value string) string { value = strings.TrimSpace(value); if len(value) == 0 || len(value) > 128 { return "" }; for _, ch := range value { if !((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '-' || ch == '_' || ch == '.') { return "" } }; return value }
func traceIDFromTraceparent(value string) string { parts := strings.Split(strings.TrimSpace(value), "-"); if len(parts) != 4 || len(parts[0]) != 2 || len(parts[1]) != 32 || len(parts[2]) != 16 || len(parts[3]) != 2 || strings.EqualFold(parts[0], "ff") || allZero(parts[1]) || allZero(parts[2]) { return "" }; for _, part := range parts { for _, ch := range part { if !((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')) { return "" } } }; return strings.ToLower(parts[1]) }
func allZero(value string) bool { for _, ch := range value { if ch != '0' { return false } }; return true }
func newTraceID() string { return newID() + newID()[:8] }
