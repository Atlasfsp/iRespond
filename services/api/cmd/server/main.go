package main

import (
	"context"
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
	Store   string `json:"store"`
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

type transitionRequest struct { State needs.VerificationState `json:"state"` }

func main() {
	ctx := context.Background()
	repo, storeName := repositoryFromEnvironment(ctx)
	defer repo.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, healthResponse{Status: "ok", Service: "irespond-api", Store: storeName, Time: time.Now().UTC().Format(time.RFC3339)})
	})
	mux.HandleFunc("GET /v1/platform", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"name":"iRespond","mobileFirst":true,"lifecycle":[]string{"see","report","verify","diagnose","project","mobilise","execute","measure","maintain","replicate"}})
	})
	mux.HandleFunc("POST /v1/needs", func(w http.ResponseWriter, r *http.Request) {
		var req createNeedRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Title)=="" || strings.TrimSpace(req.Description)=="" {
			writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid need report"}); return
		}
		if req.Latitude < -90 || req.Latitude > 90 || req.Longitude < -180 || req.Longitude > 180 {
			writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid coordinates"}); return
		}
		created,replayed,err:=repo.Create(r.Context(),needs.Need{ID:newID(),Title:strings.TrimSpace(req.Title),Description:strings.TrimSpace(req.Description),Category:req.Category,Latitude:req.Latitude,Longitude:req.Longitude,ReporterID:req.ReporterID,SDGTags:req.SDGTags},strings.TrimSpace(r.Header.Get("Idempotency-Key")))
		if err!=nil { log.Printf("create need: %v",err); writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to create need"}); return }
		if replayed { w.Header().Set("Idempotent-Replay","true") }
		writeJSON(w,http.StatusCreated,created)
	})
	mux.HandleFunc("GET /v1/needs/{id}", func(w http.ResponseWriter, r *http.Request) {
		n,err:=repo.Get(r.Context(),r.PathValue("id"))
		if errors.Is(err,needs.ErrNotFound){writeJSON(w,http.StatusNotFound,map[string]string{"error":"need not found"});return}
		if err!=nil{log.Printf("get need: %v",err);writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to load need"});return}
		writeJSON(w,http.StatusOK,n)
	})
	mux.HandleFunc("GET /v1/needs", func(w http.ResponseWriter, r *http.Request) {
		lat,e1:=strconv.ParseFloat(r.URL.Query().Get("lat"),64); lng,e2:=strconv.ParseFloat(r.URL.Query().Get("lng"),64); radius,e3:=strconv.ParseFloat(r.URL.Query().Get("radiusKm"),64)
		if e1!=nil||e2!=nil||e3!=nil||lat < -90||lat > 90||lng < -180||lng > 180||radius<=0||radius>200 {writeJSON(w,http.StatusBadRequest,map[string]string{"error":"valid lat, lng and radiusKm (0-200) are required"});return}
		items,err:=repo.Nearby(r.Context(),lat,lng,radius)
		if err!=nil{log.Printf("nearby needs: %v",err);writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to query nearby needs"});return}
		writeJSON(w,http.StatusOK,items)
	})
	mux.HandleFunc("POST /v1/needs/{id}/verification", func(w http.ResponseWriter, r *http.Request) {
		var req transitionRequest
		if err:=json.NewDecoder(r.Body).Decode(&req);err!=nil{writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid verification request"});return}
		actor:=strings.TrimSpace(r.Header.Get("X-Actor-ID")); if actor==""{writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"X-Actor-ID is required"});return}
		n,err:=repo.Transition(r.Context(),r.PathValue("id"),req.State,actor)
		switch {case errors.Is(err,needs.ErrNotFound):writeJSON(w,http.StatusNotFound,map[string]string{"error":"need not found"});case errors.Is(err,needs.ErrInvalidTransition):writeJSON(w,http.StatusConflict,map[string]string{"error":"invalid verification transition"});case err!=nil:log.Printf("transition need: %v",err);writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to update verification"});default:writeJSON(w,http.StatusOK,n)}
	})

	addr:=os.Getenv("HTTP_ADDR");if addr==""{addr=":8080"}
	server:=&http.Server{Addr:addr,Handler:requestIDMiddleware(mux),ReadHeaderTimeout:5*time.Second,ReadTimeout:15*time.Second,WriteTimeout:30*time.Second,IdleTimeout:60*time.Second}
	log.Printf("iRespond API listening on %s with %s store",addr,storeName)
	log.Fatal(server.ListenAndServe())
}

func repositoryFromEnvironment(ctx context.Context) (needs.Repository,string) {
	if databaseURL:=strings.TrimSpace(os.Getenv("DATABASE_URL"));databaseURL!="" {
		repo,err:=needs.NewPostgresRepository(ctx,databaseURL);if err!=nil{log.Fatalf("initialize postgres repository: %v",err)};return repo,"postgres-postgis"
	}
	log.Printf("DATABASE_URL is not set; using volatile in-memory repository")
	return needs.NewMemoryRepository(),"memory"
}
func writeJSON(w http.ResponseWriter,status int,value any){w.Header().Set("Content-Type","application/json");w.WriteHeader(status);_=json.NewEncoder(w).Encode(value)}
func newID() string{var b [12]byte;_,_=rand.Read(b[:]);return hex.EncodeToString(b[:])}
func requestIDMiddleware(next http.Handler) http.Handler{return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){id:=r.Header.Get("X-Request-ID");if id==""{id=newID()};w.Header().Set("X-Request-ID",id);next.ServeHTTP(w,r)})}
