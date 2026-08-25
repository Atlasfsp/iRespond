package main

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	shared "github.com/Atlasfsp/iRespond/services/api/internal/platform/privacy"
)

var irespondPrivacyPurposes=[]string{"community.personalization","impact.recommendations","research.analytics"}

func registerPrivacyRoutes(mux *http.ServeMux,identity auth.Verifier){client:=shared.New(os.Getenv("SS24_PRIVACY_URL"),valueOr(os.Getenv("SHARED_SERVICES_TENANT"),"irespond"),os.Getenv("SHARED_SERVICES_TOKEN"));mux.HandleFunc("GET /v1/me/privacy",func(w http.ResponseWriter,r *http.Request){principal,ok:=authenticate(w,r,identity);if !ok{return};if !client.Configured(){writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"privacy service is not configured"});return};purposes:=map[string]bool{};for _,purpose:=range irespondPrivacyPurposes{allowed,err:=client.CanProcess(r.Context(),principal.Subject,purpose);if err!=nil{writeJSON(w,http.StatusBadGateway,map[string]string{"error":"privacy service is unavailable"});return};purposes[purpose]=allowed};writeJSON(w,http.StatusOK,map[string]any{"purposes":purposes,"dataRights":[]string{"access","erasure"}})})
	mux.HandleFunc("PUT /v1/me/privacy/consent",func(w http.ResponseWriter,r *http.Request){principal,ok:=authenticate(w,r,identity);if !ok{return};if !client.Configured(){writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"privacy service is not configured"});return};var in struct{Purpose string `json:"purpose"`;Grant bool `json:"grant"`};if err:=json.NewDecoder(r.Body).Decode(&in);err!=nil||!allowedPrivacyPurpose(in.Purpose){writeJSON(w,http.StatusBadRequest,map[string]string{"error":"unsupported privacy purpose"});return};key:=strings.TrimSpace(r.Header.Get("Idempotency-Key"));if key==""{writeJSON(w,http.StatusBadRequest,map[string]string{"error":"Idempotency-Key is required"});return};err:=client.SetConsent(r.Context(),shared.ConsentRequest{Subject:principal.Subject,Purpose:in.Purpose,Scope:"irespond-mobile",Basis:"consent",Proof:"authenticated-mobile-setting",Grant:in.Grant},key);if err!=nil{writeJSON(w,http.StatusBadGateway,map[string]string{"error":"privacy service is unavailable"});return};writeJSON(w,http.StatusOK,map[string]any{"purpose":in.Purpose,"granted":in.Grant})})
	mux.HandleFunc("POST /v1/me/privacy/requests",func(w http.ResponseWriter,r *http.Request){principal,ok:=authenticate(w,r,identity);if !ok{return};if !client.Configured(){writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"privacy service is not configured"});return};var in struct{Kind string `json:"kind"`};if err:=json.NewDecoder(r.Body).Decode(&in);err!=nil||(in.Kind!="access"&&in.Kind!="erasure"){writeJSON(w,http.StatusBadRequest,map[string]string{"error":"kind must be access or erasure"});return};key:=strings.TrimSpace(r.Header.Get("Idempotency-Key"));if key==""{writeJSON(w,http.StatusBadRequest,map[string]string{"error":"Idempotency-Key is required"});return};dsar,err:=client.OpenDSAR(r.Context(),principal.Subject,in.Kind,key);if err!=nil{writeJSON(w,http.StatusBadGateway,map[string]string{"error":"privacy service is unavailable"});return};writeJSON(w,http.StatusCreated,dsar)})}
func allowedPrivacyPurpose(v string)bool{for _,p:=range irespondPrivacyPurposes{if v==p{return true}};return false}
