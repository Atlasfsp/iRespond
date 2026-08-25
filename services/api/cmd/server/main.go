package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

type healthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
	Time    string `json:"time"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(healthResponse{Status: "ok", Service: "irespond-api", Time: time.Now().UTC().Format(time.RFC3339)})
	})
	mux.HandleFunc("GET /v1/platform", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"name": "iRespond",
			"mobileFirst": true,
			"lifecycle": []string{"see", "report", "verify", "diagnose", "project", "mobilise", "execute", "measure", "maintain", "replicate"},
		})
	})

	addr := os.Getenv("HTTP_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	server := &http.Server{Addr: addr, Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	log.Printf("iRespond API listening on %s", addr)
	log.Fatal(server.ListenAndServe())
}
