package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	privacy "github.com/Atlasfsp/iRespond/services/api/internal/privacy"
)

func registerPrivacyRoutes(mux *http.ServeMux, identity auth.Verifier) func() {
	databaseURL:=strings.TrimSpace(os.Getenv("DATABASE_URL"))
	var svc *privacy.Service
	if databaseURL!=""{var err error;svc,err=privacy.New(context.Background(),databaseURL);if err!=nil{log.Fatalf("initialize privacy service: %v",err)}}

	mux.HandleFunc("GET /v1/me/privacy/consents",func(w http.ResponseWriter,r *http.Request){
		principal,ok:=authenticate(w,r,identity);if !ok{return};if svc==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"privacy service is not configured"});return}
		items,err:=svc.Consents(r.Context(),principal.Subject);if err!=nil{log.Printf("list privacy consents: %v",err);writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to load consents"});return};writeJSON(w,http.StatusOK,items)
	})
	mux.HandleFunc("PUT /v1/me/privacy/consents/{purpose}",func(w http.ResponseWriter,r *http.Request){
		principal,ok:=authenticate(w,r,identity);if !ok{return};if svc==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"privacy service is not configured"});return}
		var in struct{Granted bool `json:"granted"`;PolicyVersion string `json:"policyVersion"`};if err:=json.NewDecoder(r.Body).Decode(&in);err!=nil{writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid consent payload"});return}
		out,err:=svc.SetConsent(r.Context(),principal.Subject,r.PathValue("purpose"),in.Granted,in.PolicyVersion);if errors.Is(err,privacy.ErrInvalidPurpose){writeJSON(w,http.StatusBadRequest,map[string]string{"error":"purpose and policyVersion are required"});return};if err!=nil{log.Printf("set privacy consent: %v",err);writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to save consent"});return};writeJSON(w,http.StatusOK,out)
	})
	mux.HandleFunc("GET /v1/me/privacy/requests",func(w http.ResponseWriter,r *http.Request){
		principal,ok:=authenticate(w,r,identity);if !ok{return};if svc==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"privacy service is not configured"});return};items,err:=svc.Requests(r.Context(),principal.Subject);if err!=nil{writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to load privacy requests"});return};writeJSON(w,http.StatusOK,items)
	})
	mux.HandleFunc("POST /v1/me/privacy/requests",func(w http.ResponseWriter,r *http.Request){
		principal,ok:=authenticate(w,r,identity);if !ok{return};if svc==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"privacy service is not configured"});return}
		var in struct{Type string `json:"type"`};if err:=json.NewDecoder(r.Body).Decode(&in);err!=nil{writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid privacy request"});return};out,err:=svc.Request(r.Context(),principal.Subject,in.Type);if errors.Is(err,privacy.ErrInvalidRequestType){writeJSON(w,http.StatusBadRequest,map[string]string{"error":"type must be access, export, correction, or deletion"});return};if err!=nil{log.Printf("create privacy request: %v",err);writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to create privacy request"});return};writeJSON(w,http.StatusAccepted,out)
	})
	return func(){if svc!=nil{svc.Close()}}
}
