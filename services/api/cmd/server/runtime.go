package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type runtimeStatus struct {
	Store    string
	Auth     string
	Evidence string
	Projects string
}

var processStartedAt = time.Now().UTC()

var productionRequiredEnvironment = []string{
	"DATABASE_URL",
	"OIDC_ISSUER",
	"OIDC_AUDIENCE",
	"OIDC_JWKS_URL",
	"OBJECT_STORAGE_ENDPOINT",
	"OBJECT_STORAGE_ACCESS_KEY",
	"OBJECT_STORAGE_SECRET_KEY",
	"OBJECT_STORAGE_BUCKET",
}

func validateProductionEnvironment(getenv func(string) string) error {
	mode := strings.ToLower(strings.TrimSpace(getenv("IRESPOND_ENV")))
	if mode != "production" {
		return nil
	}
	missing := make([]string, 0)
	for _, key := range productionRequiredEnvironment {
		if strings.TrimSpace(getenv(key)) == "" {
			missing = append(missing, key)
		}
	}
	sort.Strings(missing)
	if len(missing) > 0 {
		return fmt.Errorf("production configuration incomplete: missing %s", strings.Join(missing, ", "))
	}
	return nil
}

func (s runtimeStatus) readiness() (bool, []string) {
	missing := make([]string, 0, 4)
	if s.Store == "memory" || strings.Contains(s.Store, "unconfigured") {
		missing = append(missing, "relational_store")
	}
	if strings.Contains(s.Auth, "unconfigured") {
		missing = append(missing, "identity")
	}
	if strings.Contains(s.Evidence, "unconfigured") {
		missing = append(missing, "evidence")
	}
	if strings.Contains(s.Projects, "unconfigured") {
		missing = append(missing, "projects")
	}
	return len(missing) == 0, missing
}

func registerRuntimeRoutes(mux *http.ServeMux, status runtimeStatus) {
	mux.HandleFunc("GET /livez", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "alive", "service": "irespond-api"})
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, _ *http.Request) {
		ready, missing := status.readiness()
		code := http.StatusOK
		state := "ready"
		if !ready {
			code = http.StatusServiceUnavailable
			state = "not_ready"
		}
		writeJSON(w, code, map[string]any{
			"status": state,
			"service": "irespond-api",
			"dependencies": map[string]string{
				"store": status.Store,
				"identity": status.Auth,
				"evidence": status.Evidence,
				"projects": status.Projects,
			},
			"missing": missing,
		})
	})
	mux.HandleFunc("GET /metrics", func(w http.ResponseWriter, _ *http.Request) {
		ready, _ := status.readiness()
		readyValue := 0
		if ready {
			readyValue = 1
		}
		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		_, _ = fmt.Fprintf(w, "# HELP irespond_runtime_ready Whether required runtime dependencies are configured and ready.\n# TYPE irespond_runtime_ready gauge\nirespond_runtime_ready %d\n", readyValue)
		_, _ = fmt.Fprintf(w, "# HELP irespond_process_uptime_seconds Process uptime in seconds.\n# TYPE irespond_process_uptime_seconds gauge\nirespond_process_uptime_seconds %.0f\n", time.Since(processStartedAt).Seconds())
		_, _ = fmt.Fprintf(w, "# HELP irespond_build_info Build identity for the running API.\n# TYPE irespond_build_info gauge\nirespond_build_info{version=%s,git_sha=%s} 1\n", prometheusQuote(valueOr(os.Getenv("APP_VERSION"), "dev")), prometheusQuote(valueOr(os.Getenv("GIT_SHA"), "unknown")))
		for name, value := range map[string]string{"store": status.Store, "identity": status.Auth, "evidence": status.Evidence, "projects": status.Projects} {
			configured := 1
			if value == "memory" || strings.Contains(value, "unconfigured") {
				configured = 0
			}
			_, _ = fmt.Fprintf(w, "irespond_runtime_dependency_configured{dependency=%s,implementation=%s} %d\n", prometheusQuote(name), prometheusQuote(value), configured)
		}
		gatewayRequestMetrics.writePrometheus(w)
	})
	mux.HandleFunc("GET /version", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"service": "irespond-api",
			"version": valueOr(os.Getenv("APP_VERSION"), "dev"),
			"gitSha": valueOr(os.Getenv("GIT_SHA"), "unknown"),
			"buildTime": valueOr(os.Getenv("BUILD_TIME"), "unknown"),
		})
	})
}

func prometheusQuote(value string) string {
	return strconv.Quote(strings.TrimSpace(value))
}

func valueOr(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}

func runHTTPServer(server *http.Server) error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		err := server.ListenAndServe()
		if errors.Is(err, http.ErrServerClosed) {
			err = nil
		}
		errCh <- err
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("graceful shutdown: %w", err)
		}
		return <-errCh
	}
}
