package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
)

type config struct {
	BaseURL       string
	Requests      int
	Concurrency   int
	SeedNeeds     int
	MaxP95        time.Duration
	MinimumRPS    float64
	RequestTimeout time.Duration
}

type needReport struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	SDGTags     []int   `json:"sdgTags"`
}

func main() {
	cfg, err := configFromEnv()
	if err != nil {
		fatal(err)
	}
	client := &http.Client{Timeout: cfg.RequestTimeout}
	if err := waitHealthy(client, cfg.BaseURL, 30*time.Second); err != nil {
		fatal(err)
	}
	if err := seedNeeds(client, cfg); err != nil {
		fatal(err)
	}
	if err := runReadLoad(client, cfg); err != nil {
		fatal(err)
	}
}

func configFromEnv() (config, error) {
	cfg := config{
		BaseURL:        valueOr("LOADCHECK_BASE_URL", "http://127.0.0.1:18080"),
		Requests:       intEnv("LOADCHECK_REQUESTS", 300),
		Concurrency:    intEnv("LOADCHECK_CONCURRENCY", 20),
		SeedNeeds:      intEnv("LOADCHECK_SEED_NEEDS", 40),
		MaxP95:         time.Duration(intEnv("LOADCHECK_MAX_P95_MS", 1000)) * time.Millisecond,
		MinimumRPS:     floatEnv("LOADCHECK_MIN_RPS", 20),
		RequestTimeout: time.Duration(intEnv("LOADCHECK_REQUEST_TIMEOUT_MS", 5000)) * time.Millisecond,
	}
	if cfg.Requests < 1 || cfg.Concurrency < 1 || cfg.SeedNeeds < 1 || cfg.Concurrency > cfg.Requests {
		return config{}, fmt.Errorf("invalid load shape: requests=%d concurrency=%d seedNeeds=%d", cfg.Requests, cfg.Concurrency, cfg.SeedNeeds)
	}
	if cfg.MaxP95 <= 0 || cfg.MinimumRPS <= 0 || cfg.RequestTimeout <= 0 {
		return config{}, fmt.Errorf("performance thresholds must be positive")
	}
	return cfg, nil
}

func waitHealthy(client *http.Client, baseURL string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		resp, err := client.Get(baseURL + "/healthz")
		if err == nil {
			_, _ = io.Copy(io.Discard, resp.Body)
			_ = resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
		time.Sleep(250 * time.Millisecond)
	}
	return fmt.Errorf("API did not become healthy within %s", timeout)
}

func seedNeeds(client *http.Client, cfg config) error {
	for i := 0; i < cfg.SeedNeeds; i++ {
		body, _ := json.Marshal(needReport{
			Title:       fmt.Sprintf("GA load baseline need %03d", i),
			Description: "Synthetic CI need used only to exercise the YugabyteDB-backed public read path.",
			Category:    "ci-performance",
			Latitude:    6.52 + float64(i%5)*0.001,
			Longitude:   3.37 + float64(i%7)*0.001,
			SDGTags:     []int{9, 11, 17},
		})
		req, err := http.NewRequest(http.MethodPost, cfg.BaseURL+"/v1/needs", bytes.NewReader(body))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", fmt.Sprintf("ci-load-seed-%d-%d", time.Now().UnixNano(), i))
		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("seed need %d: %w", i, err)
		}
		_, _ = io.Copy(io.Discard, resp.Body)
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusCreated {
			return fmt.Errorf("seed need %d returned HTTP %d", i, resp.StatusCode)
		}
	}
	return nil
}

func runReadLoad(client *http.Client, cfg config) error {
	const path = "/v1/needs?lat=6.52&lng=3.37&radiusKm=50"
	jobs := make(chan int)
	durations := make([]time.Duration, cfg.Requests)
	var successes atomic.Int64
	var failures atomic.Int64
	var firstFailure atomic.Value
	var wg sync.WaitGroup

	for worker := 0; worker < cfg.Concurrency; worker++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for index := range jobs {
				started := time.Now()
				resp, err := client.Get(cfg.BaseURL + path)
				durations[index] = time.Since(started)
				if err != nil {
					failures.Add(1)
					storeFirstFailure(&firstFailure, err.Error())
					continue
				}
				body, readErr := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
				_ = resp.Body.Close()
				if readErr != nil || resp.StatusCode != http.StatusOK || len(body) == 0 {
					failures.Add(1)
					storeFirstFailure(&firstFailure, fmt.Sprintf("status=%d bodyBytes=%d readErr=%v", resp.StatusCode, len(body), readErr))
					continue
				}
				successes.Add(1)
			}
		}()
	}

	started := time.Now()
	for i := 0; i < cfg.Requests; i++ {
		jobs <- i
	}
	close(jobs)
	wg.Wait()
	elapsed := time.Since(started)

	sorted := append([]time.Duration(nil), durations...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })
	p50 := percentile(sorted, 0.50)
	p95 := percentile(sorted, 0.95)
	p99 := percentile(sorted, 0.99)
	rps := float64(cfg.Requests) / elapsed.Seconds()

	fmt.Printf("iRespond CI load baseline: requests=%d concurrency=%d success=%d failure=%d elapsed=%s rps=%.2f p50=%s p95=%s p99=%s\n",
		cfg.Requests, cfg.Concurrency, successes.Load(), failures.Load(), elapsed.Round(time.Millisecond), rps, p50.Round(time.Millisecond), p95.Round(time.Millisecond), p99.Round(time.Millisecond))
	fmt.Printf("thresholds: success=100%% minRPS=%.2f maxP95=%s\n", cfg.MinimumRPS, cfg.MaxP95)

	if failures.Load() != 0 || successes.Load() != int64(cfg.Requests) {
		failure := "unknown"
		if value := firstFailure.Load(); value != nil {
			failure = value.(string)
		}
		return fmt.Errorf("load baseline had failed requests: first=%s", failure)
	}
	if p95 > cfg.MaxP95 {
		return fmt.Errorf("p95 latency %s exceeds threshold %s", p95, cfg.MaxP95)
	}
	if rps < cfg.MinimumRPS {
		return fmt.Errorf("throughput %.2f rps below threshold %.2f", rps, cfg.MinimumRPS)
	}
	return nil
}

func percentile(values []time.Duration, fraction float64) time.Duration {
	if len(values) == 0 {
		return 0
	}
	index := int(float64(len(values)-1) * fraction)
	if index < 0 {
		index = 0
	}
	if index >= len(values) {
		index = len(values) - 1
	}
	return values[index]
}

func storeFirstFailure(target *atomic.Value, value string) {
	if target.Load() == nil {
		target.Store(value)
	}
}

func valueOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func intEnv(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func floatEnv(key string, fallback float64) float64 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, "loadcheck:", err)
	os.Exit(1)
}
