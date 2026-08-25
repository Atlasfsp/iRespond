package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	"github.com/Atlasfsp/iRespond/services/api/internal/impact"
)

func registerImpactRoutes(mux *http.ServeMux, identity auth.Verifier) func() {
	databaseURL:=strings.TrimSpace(os.Getenv("DATABASE_URL"));var svc *impact.Service
	if databaseURL!=""{var err error;svc,err=impact.New(context.Background(),databaseURL);if err!=nil{log.Fatalf("initialize impact passport: %v",err)}}
	mux.HandleFunc("GET /v1/me/impact-passport",func(w http.ResponseWriter,r *http.Request){principal,ok:=authenticate(w,r,identity);if !ok{return};if svc==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"impact passport is not configured"});return};p,err:=svc.Passport(r.Context(),principal.Subject);if err!=nil{log.Printf("impact passport: %v",err);writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to build impact passport"});return};writeJSON(w,http.StatusOK,p)})
	return func(){if svc!=nil{svc.Close()}}
}
