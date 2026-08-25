package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/Atlasfsp/iRespond/services/api/internal/needs"
)

type healthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
	Time    string `json:"time"`
}

type createNeedRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	ReporterID  string  `json:"reporterId"`
	SDGTags     []int   `json:"sdgTags"`
}

type transitionRequest struct {
	State needs.VerificationState `json:"state"`
}

func main() {
	store := needs.NewStore()
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, healthResponse{Status: "ok", Service: "irespond-api", Time: time.Now().UTC().Format(time.RFC3339)})
	})
	mux.HandleFunc("GET /v1/platform", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"name": "iRespond",
			"mobileFirst": true,
			"lifecycle": []string{"see", "report", "verify", "diagnose", "project", "mobilise", "execute", "measure", "maintain", "replicate"},
		})
	})
	mux.HandleFunc("POST /v1/needs", func(w http.ResponseWriter, r *http.Request) {
		var req createNeedRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Description) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error":"invalid need report"})
			return
		}
		created := store.Create(needs.Need{ID:newID(), Title:strings.TrimSpace(req.Title), Description:strings.TrimSpace(req.Description), Category:req.Category, Latitude:req.Latitude, Longitude:req.Longitude, ReporterID:req.ReporterID, SDGTags:req.SDGTags})
		writeJSON(w, http.StatusCreated, created)
	})
	mux.HandleFunc("GET /v1/needs/{id}", func(w http.ResponseWriter, r *http.Request) {
		n, err := store.Get(r.PathValue("id"))
		if errors.Is(err, needs.ErrNotFound) { writeJSON(w, http.StatusNotFound, map[string]string{"error":"need not found"}); return }
		writeJSON(w, http.StatusOK, n)
	})
	mux.HandleFunc("GET /v1/needs", func(w http.ResponseWriter, r *http.Request) {
		lat, err1 := strconv.ParseFloat(r.URL.Query().Get("lat"),64)
		lng, err2 := strconv.ParseFloat(r.URL.Query().Get("lng"),64)
		radius, err3 := strconv.ParseFloat(r.URL.Query().Get("radiusKm"),64)
		if err1 != nil || err2 != nil || err3 != nil || radius <= 0 || radius > 200 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error":"lat, lng and radiusKm (0-200) are required"}); return
		}
		writeJSON(w, http.StatusOK, store.Nearby(lat,lng,radius))
	})
	mux.HandleFunc("POST /v1/needs/{id}/verification", func(w http.ResponseWriter, r *http.Request) {
		var req transitionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid verification request"}); return }
		n, err := store.Transition(r.PathValue("id"), req.State)
		switch {
		case errors.Is(err, needs.ErrNotFound): writeJSON(w,http.StatusNotFound,map[string]string{"error":"need not found"})
		case errors.Is(err, needs.ErrInvalidTransition): writeJSON(w,http.StatusConflict,map[string]string{"error":"invalid verification transition"})
		default: writeJSON(w,http.StatusOK,n)
		}
	})

	addr := os.Getenv("HTTP_ADDR")
	if addr == "" { addr = ":8080" }
	server := &http.Server{Addr: addr, Handler: requestIDMiddleware(mux), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("iRespond API listening on %s", addr)
	log.Fatal(server.ListenAndServe())
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type","application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func newID() string {
	var b [12]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

func requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-ID")
		if id == "" { id = newID() }
		w.Header().Set("X-Request-ID",id)
		next.ServeHTTP(w,r)
	})
}
