package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestValidateProductionEnvironmentFailsClosed(t *testing.T) {
	env := map[string]string{"IRESPOND_ENV": "production", "DATABASE_URL": "postgres://yb"}
	err := validateProductionEnvironment(func(key string) string { return env[key] })
	if err == nil {
		t.Fatal("expected production configuration error")
	}
	if !strings.Contains(err.Error(), "OIDC_ISSUER") || !strings.Contains(err.Error(), "OBJECT_STORAGE_BUCKET") {
		t.Fatalf("missing required keys not reported: %v", err)
	}
}

func TestValidateProductionEnvironmentAllowsCompleteConfig(t *testing.T) {
	env := map[string]string{"IRESPOND_ENV": "production"}
	for _, key := range productionRequiredEnvironment {
		env[key] = "configured"
	}
	if err := validateProductionEnvironment(func(key string) string { return env[key] }); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
}

func TestReadyzFailsClosedWhenDependenciesMissing(t *testing.T) {
	mux := http.NewServeMux()
	registerRuntimeRoutes(mux, runtimeStatus{Store: "memory", Auth: "unconfigured-fail-closed", Evidence: "unconfigured-fail-closed", Projects: "unconfigured-fail-closed"})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusServiceUnavailable, rr.Body.String())
	}
}

func TestReadyzPassesForConfiguredRuntime(t *testing.T) {
	mux := http.NewServeMux()
	registerRuntimeRoutes(mux, runtimeStatus{Store: "yugabytedb-ysql", Auth: "oidc-rs256", Evidence: "shared-media-signed-urls", Projects: "yugabytedb-action-projects"})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestLivezDoesNotDependOnDownstreamReadiness(t *testing.T) {
	mux := http.NewServeMux()
	registerRuntimeRoutes(mux, runtimeStatus{Store: "memory", Auth: "unconfigured-fail-closed", Evidence: "unconfigured-fail-closed", Projects: "unconfigured-fail-closed"})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/livez", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"status":"alive"`) {
		t.Fatalf("unexpected livez response status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestMetricsExposeReadinessBuildAndDependencyState(t *testing.T) {
	t.Setenv("APP_VERSION", "1.2.3")
	t.Setenv("GIT_SHA", "abc123")
	mux := http.NewServeMux()
	registerRuntimeRoutes(mux, runtimeStatus{Store: "yugabytedb-ysql", Auth: "oidc-rs256", Evidence: "s3-compatible-signed-urls", Projects: "yugabytedb-action-projects"})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/metrics", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	if got := rr.Header().Get("Content-Type"); !strings.Contains(got, "text/plain") {
		t.Fatalf("unexpected metrics content type %q", got)
	}
	for _, want := range []string{
		"irespond_runtime_ready 1",
		"irespond_process_uptime_seconds",
		`irespond_build_info{version="1.2.3",git_sha="abc123"} 1`,
		`dependency="store"`,
		`implementation="yugabytedb-ysql"`,
	} {
		if !strings.Contains(rr.Body.String(), want) {
			t.Fatalf("metrics missing %q: %s", want, rr.Body.String())
		}
	}
}

func TestMetricsFailClosedWhenRuntimeNotReady(t *testing.T) {
	mux := http.NewServeMux()
	registerRuntimeRoutes(mux, runtimeStatus{Store: "memory", Auth: "unconfigured-fail-closed", Evidence: "unconfigured-fail-closed", Projects: "unconfigured-fail-closed"})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/metrics", nil))
	if !strings.Contains(rr.Body.String(), "irespond_runtime_ready 0") || !strings.Contains(rr.Body.String(), `implementation="memory"} 0`) {
		t.Fatalf("metrics did not expose fail-closed state: %s", rr.Body.String())
	}
}
