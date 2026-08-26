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
	inbox "github.com/Atlasfsp/iRespond/services/api/internal/notifications"
	shared "github.com/Atlasfsp/iRespond/services/api/internal/platform/notifications"
)

func registerNotificationRoutes(mux *http.ServeMux, identity auth.Verifier) func() {
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	var svc *inbox.Service
	if databaseURL != "" {
		var err error
		svc, err = inbox.New(context.Background(), databaseURL)
		if err != nil { log.Fatalf("initialize notification inbox: %v", err) }
	}
	ss18 := shared.New(os.Getenv("SS18_NOTIFICATIONS_URL"), valueOr(os.Getenv("SHARED_SERVICES_TENANT"), "irespond"), os.Getenv("SHARED_SERVICES_TOKEN"))

	mux.HandleFunc("GET /v1/me/notifications", func(w http.ResponseWriter, r *http.Request) {
		principal, ok := authenticate(w,r,identity); if !ok{return}
		if svc==nil { writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"notification inbox is not configured"}); return }
		items,err:=svc.List(r.Context(),principal.Subject);if err!=nil{log.Printf("list notifications: %v",err);writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to load notifications"});return};writeJSON(w,http.StatusOK,items)
	})
	mux.HandleFunc("POST /v1/me/notifications/{id}/read", func(w http.ResponseWriter, r *http.Request) {
		principal,ok:=authenticate(w,r,identity);if !ok{return};if svc==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"notification inbox is not configured"});return}
		item,err:=svc.MarkRead(r.Context(),principal.Subject,r.PathValue("id"));if errors.Is(err,inbox.ErrNotFound){writeJSON(w,http.StatusNotFound,map[string]string{"error":"notification not found"});return};if err!=nil{writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to update notification"});return};writeJSON(w,http.StatusOK,item)
	})
	mux.HandleFunc("GET /v1/me/notification-preferences", func(w http.ResponseWriter,r *http.Request){principal,ok:=authenticate(w,r,identity);if !ok{return};if svc==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"notification preferences are not configured"});return};p,err:=svc.Preferences(r.Context(),principal.Subject);if err!=nil{writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to load notification preferences"});return};writeJSON(w,http.StatusOK,p)})
	mux.HandleFunc("PUT /v1/me/notification-preferences", func(w http.ResponseWriter,r *http.Request){principal,ok:=authenticate(w,r,identity);if !ok{return};if svc==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"notification preferences are not configured"});return};var p inbox.Preferences;if err:=json.NewDecoder(r.Body).Decode(&p);err!=nil{writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid notification preferences"});return};out,err:=svc.SetPreferences(r.Context(),principal.Subject,p);if err!=nil{writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to save notification preferences"});return};writeJSON(w,http.StatusOK,out)})

	mux.HandleFunc("POST /v1/internal/notifications", func(w http.ResponseWriter,r *http.Request){
		internalToken:=strings.TrimSpace(os.Getenv("INTERNAL_NOTIFICATION_TOKEN"));if internalToken==""||r.Header.Get("Authorization")!="Bearer "+internalToken{writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"internal notification token required"});return}
		if svc==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"notification inbox is not configured"});return}
		var in struct{UserID string `json:"userId"`;Category string `json:"category"`;Title string `json:"title"`;Body string `json:"body"`;ResourceType string `json:"resourceType"`;ResourceID string `json:"resourceId"`;Template string `json:"template"`;Class string `json:"class"`};if err:=json.NewDecoder(r.Body).Decode(&in);err!=nil||strings.TrimSpace(in.UserID)==""||strings.TrimSpace(in.Title)==""{writeJSON(w,http.StatusBadRequest,map[string]string{"error":"userId and title are required"});return}
		item,err:=svc.Create(r.Context(),in.UserID,in.Category,in.Title,in.Body,in.ResourceType,in.ResourceID);if err!=nil{writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to create notification"});return}
		response:=map[string]any{"notification":item,"externalDelivery":"not_requested"}
		if in.Template!="" && ss18.Configured(){delivery,sendErr:=ss18.SendIntent(r.Context(),shared.Intent{Recipient:in.UserID,Template:in.Template,Sender:"irespond",Class:valueOr(in.Class,"transactional"),Category:in.Category},r.Header.Get("Idempotency-Key"));if sendErr!=nil{response["externalDelivery"]="failed";response["deliveryError"]=sendErr.Error()}else{response["externalDelivery"]=delivery}}
		writeJSON(w,http.StatusCreated,response)
	})
	closeImpact:=registerImpactRoutes(mux,identity)
	closePrivacy:=registerPrivacyRoutes(mux,identity)
	closeFunding:=registerFundingRoutes(mux,identity)
	return func(){closeFunding();closePrivacy();closeImpact();if svc!=nil{svc.Close()}}
}
