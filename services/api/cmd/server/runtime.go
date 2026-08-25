package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"sort"
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
	mux.HandleFunc("GET /version", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"service": "irespond-api",
			"version": valueOr(os.Getenv("APP_VERSION"), "dev"),
			"gitSha": valueOr(os.Getenv("GIT_SHA"), "unknown"),
			"buildTime": valueOr(os.Getenv("BUILD_TIME"), "unknown"),
		})
	})
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
