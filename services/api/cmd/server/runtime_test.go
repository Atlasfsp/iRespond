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
