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
	"github.com/Atlasfsp/iRespond/services/api/internal/funding"
	"github.com/Atlasfsp/iRespond/services/api/internal/projects"
)

type fundingPlanRequest struct{Currency string `json:"currency"`;TargetMinor int64 `json:"targetMinor"`;CommunityCounterpartMinor int64 `json:"communityCounterpartMinor"`}
type fundingPledgeRequest struct{ContributionClass string `json:"contributionClass"`;AmountMinor int64 `json:"amountMinor"`}

func registerFundingRoutes(mux *http.ServeMux,identity auth.Verifier,manager *projects.Manager)func(){
	db:=strings.TrimSpace(os.Getenv("DATABASE_URL"));var svc *funding.Service
	if db!=""{var err error;svc,err=funding.New(context.Background(),db);if err!=nil{log.Fatalf("initialize funding service: %v",err)}}
	available:=func(w http.ResponseWriter)bool{if svc==nil||manager==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"funding service is not configured"});return false};return true}
	canManage:=func(r *http.Request,p auth.Principal)(bool,error){if p.HasRole("project_steward")||p.HasRole("trust_safety_admin"){return true,nil};return manager.HasAnyProjectRole(r.Context(),r.PathValue("id"),p.Subject,"project_manager","community_steward")}

	mux.HandleFunc("GET /v1/projects/{id}/funding",func(w http.ResponseWriter,r *http.Request){if !available(w){return};if _,ok:=authenticate(w,r,identity);!ok{return};plan,err:=svc.Plan(r.Context(),r.PathValue("id"));if errors.Is(err,funding.ErrPlanNotFound){writeJSON(w,http.StatusNotFound,map[string]string{"error":"funding plan not found"});return};if err!=nil{writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to load funding plan"});return};writeJSON(w,http.StatusOK,plan)})
	mux.HandleFunc("PUT /v1/projects/{id}/funding",func(w http.ResponseWriter,r *http.Request){if !available(w){return};p,ok:=authenticate(w,r,identity);if !ok{return};allowed,err:=canManage(r,p);if err!=nil{writeJSON(w,500,map[string]string{"error":"unable to authorize funding plan"});return};if !allowed{writeJSON(w,403,map[string]string{"error":"project manager or community steward role required"});return};var in fundingPlanRequest;if json.NewDecoder(r.Body).Decode(&in)!=nil{writeJSON(w,400,map[string]string{"error":"invalid funding plan"});return};plan,err:=svc.UpsertPlan(r.Context(),r.PathValue("id"),in.Currency,in.TargetMinor,in.CommunityCounterpartMinor,p.Subject);switch{case errors.Is(err,funding.ErrProjectNotFound):writeJSON(w,404,map[string]string{"error":"project not found"});case errors.Is(err,funding.ErrInvalidFundingPlan):writeJSON(w,400,map[string]string{"error":"target and counterpart must be valid minor-unit amounts in a 3-letter currency"});case err!=nil:writeJSON(w,500,map[string]string{"error":"unable to save funding plan"});default:writeJSON(w,200,plan)}})
	mux.HandleFunc("POST /v1/projects/{id}/funding/pledges",func(w http.ResponseWriter,r *http.Request){if !available(w){return};p,ok:=authenticate(w,r,identity);if !ok{return};var in fundingPledgeRequest;if json.NewDecoder(r.Body).Decode(&in)!=nil{writeJSON(w,400,map[string]string{"error":"invalid pledge"});return};pledge,err:=svc.CreatePledge(r.Context(),r.PathValue("id"),p.Subject,in.ContributionClass,in.AmountMinor);switch{case errors.Is(err,funding.ErrPlanNotFound):writeJSON(w,404,map[string]string{"error":"funding plan not found"});case errors.Is(err,funding.ErrPlanNotOpen):writeJSON(w,409,map[string]string{"error":"funding plan is not open"});case errors.Is(err,funding.ErrInvalidFundingPlan):writeJSON(w,400,map[string]string{"error":"invalid contribution class or amount"});case err!=nil:writeJSON(w,500,map[string]string{"error":"unable to record pledge"});default:writeJSON(w,201,map[string]any{"pledge":pledge,"moneyMovement":"not_started","notice":"A pledge records intent only. Funds are not held or moved by iRespond."})}})
	mux.HandleFunc("GET /v1/projects/{id}/funding/pledges",func(w http.ResponseWriter,r *http.Request){if !available(w){return};p,ok:=authenticate(w,r,identity);if !ok{return};allowed,err:=canManage(r,p);if err!=nil{writeJSON(w,500,map[string]string{"error":"unable to authorize pledge review"});return};if !allowed{writeJSON(w,403,map[string]string{"error":"project manager or community steward role required"});return};items,err:=svc.ListProjectPledges(r.Context(),r.PathValue("id"));if err!=nil{writeJSON(w,500,map[string]string{"error":"unable to load pledges"});return};writeJSON(w,200,items)})
	mux.HandleFunc("GET /v1/me/funding/pledges",func(w http.ResponseWriter,r *http.Request){if !available(w){return};p,ok:=authenticate(w,r,identity);if !ok{return};items,err:=svc.ListMyPledges(r.Context(),p.Subject);if err!=nil{writeJSON(w,500,map[string]string{"error":"unable to load your pledges"});return};writeJSON(w,200,items)})
	mux.HandleFunc("POST /v1/funding/pledges/{pledgeId}/cancel",func(w http.ResponseWriter,r *http.Request){if !available(w){return};p,ok:=authenticate(w,r,identity);if !ok{return};pledge,err:=svc.CancelPledge(r.Context(),r.PathValue("pledgeId"),p.Subject);if errors.Is(err,funding.ErrPledgeNotFound){writeJSON(w,404,map[string]string{"error":"open pledge not found for this identity"});return};if err!=nil{writeJSON(w,409,map[string]string{"error":"unable to cancel pledge"});return};writeJSON(w,200,pledge)})
	return func(){if svc!=nil{svc.Close()}}
}
