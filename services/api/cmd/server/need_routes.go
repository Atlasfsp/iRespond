package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	"github.com/Atlasfsp/iRespond/services/api/internal/needs"
	"log"
	"net/http"
	"strconv"
	"strings"
)

func createNeedHandler(repo needs.Repository, identity auth.Verifier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reporter := ""
		if r.Header.Get("Authorization") != "" {
			principal, ok := authenticate(w, r, identity)
			if !ok {
				return
			}
			if !principal.IsHuman() {
				writeJSON(w, http.StatusForbidden, map[string]string{"error": "human observation submission required"})
				return
			}
			reporter = principal.Subject
		}
		var req createNeedRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Description) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid need report"})
			return
		}
		if req.Latitude < -90 || req.Latitude > 90 || req.Longitude < -180 || req.Longitude > 180 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid coordinates"})
			return
		}
		created, replayed, err := repo.Create(r.Context(), needs.Need{ID: newID(), Title: strings.TrimSpace(req.Title), Description: strings.TrimSpace(req.Description), Category: req.Category, Latitude: req.Latitude, Longitude: req.Longitude, ReporterID: reporter, SDGTags: req.SDGTags}, scopedNeedIdempotencyKey(reporter, strings.TrimSpace(r.Header.Get("Idempotency-Key"))))
		if errors.Is(err, needs.ErrIdempotencyConflict) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "idempotency key is bound to another observation"})
			return
		}
		if err != nil {
			log.Printf("create need: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to create need"})
			return
		}
		if replayed {
			w.Header().Set("Idempotent-Replay", "true")
		}
		writeJSON(w, http.StatusCreated, created)
	}
}

// v2 keeps untrusted historical body-supplied reporter identities out of new
// authenticated retry namespaces. Deployment must account for legacy queued keys.
func scopedNeedIdempotencyKey(reporter, key string) string {
	if key == "" {
		return ""
	}
	digest := sha256.Sum256([]byte("need-create-v2\x00" + reporter + "\x00" + key))
	return hex.EncodeToString(digest[:])
}

func getNeedHandler(repo needs.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		n, err := repo.Get(r.Context(), r.PathValue("id"))
		if errors.Is(err, needs.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "need not found"})
			return
		}
		if err != nil {
			log.Printf("get need: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to load need"})
			return
		}
		n.ReporterID = ""
		writeJSON(w, http.StatusOK, n)
	}
}

func nearbyNeedsHandler(repo needs.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		lat, e1 := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
		lng, e2 := strconv.ParseFloat(r.URL.Query().Get("lng"), 64)
		radius, e3 := strconv.ParseFloat(r.URL.Query().Get("radiusKm"), 64)
		if e1 != nil || e2 != nil || e3 != nil || lat < -90 || lat > 90 || lng < -180 || lng > 180 || radius <= 0 || radius > 200 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "valid lat, lng and radiusKm (0-200) are required"})
			return
		}
		items, err := repo.Nearby(r.Context(), lat, lng, radius)
		if err != nil {
			log.Printf("nearby needs: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to query nearby needs"})
			return
		}
		for i := range items {
			items[i].ReporterID = ""
		}
		writeJSON(w, http.StatusOK, items)
	}
}
