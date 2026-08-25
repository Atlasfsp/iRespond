package main

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	"github.com/Atlasfsp/iRespond/services/api/internal/projects"
)

type contributionDecisionRequest struct{Decision string `json:"decision"`;CloseNeed bool `json:"closeNeed"`}

func registerContributionCommitmentRoutes(mux *http.ServeMux,identity auth.Verifier,manager *projects.Manager){
	unavailable:=func(w http.ResponseWriter)bool{if manager==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"project service is not configured"});return true};return false}
	canManage:=func(r *http.Request,p auth.Principal)(bool,error){if p.HasRole("trust_safety_admin")||p.HasRole("project_steward"){return true,nil};return manager.HasAnyProjectRole(r.Context(),r.PathValue("id"),p.Subject,"project_manager","community_steward","volunteer_lead")}

	mux.HandleFunc("GET /v1/projects/{id}/contribution-offers",func(w http.ResponseWriter,r *http.Request){if unavailable(w){return};p,ok:=authenticate(w,r,identity);if !ok{return};allowed,err:=canManage(r,p);if err!=nil{writeJSON(w,500,map[string]string{"error":"unable to authorize contribution review"});return};if !allowed{writeJSON(w,403,map[string]string{"error":"project contribution steward role required"});return};items,err:=manager.ListProjectOffers(r.Context(),r.PathValue("id"));if err!=nil{writeJSON(w,500,map[string]string{"error":"unable to load contribution offers"});return};writeJSON(w,200,items)})
	mux.HandleFunc("GET /v1/me/contribution-offers",func(w http.ResponseWriter,r *http.Request){if unavailable(w){return};p,ok:=authenticate(w,r,identity);if !ok{return};items,err:=manager.ListContributorOffers(r.Context(),p.Subject);if err!=nil{writeJSON(w,500,map[string]string{"error":"unable to load your contribution offers"});return};writeJSON(w,200,items)})
	mux.HandleFunc("POST /v1/projects/{id}/contribution-offers/{offerId}/decision",func(w http.ResponseWriter,r *http.Request){if unavailable(w){return};p,ok:=authenticate(w,r,identity);if !ok{return};allowed,err:=canManage(r,p);if err!=nil{writeJSON(w,500,map[string]string{"error":"unable to authorize contribution review"});return};if !allowed{writeJSON(w,403,map[string]string{"error":"project contribution steward role required"});return};var req contributionDecisionRequest;if json.NewDecoder(r.Body).Decode(&req)!=nil{writeJSON(w,400,map[string]string{"error":"invalid contribution decision"});return};offer,err:=manager.DecideContributionOffer(r.Context(),r.PathValue("id"),r.PathValue("offerId"),req.Decision,p.Subject,req.CloseNeed);switch{case errors.Is(err,projects.ErrContributionOfferNotFound):writeJSON(w,404,map[string]string{"error":"contribution offer not found"});case errors.Is(err,projects.ErrInvalidContributionDecision):writeJSON(w,400,map[string]string{"error":"decision must be accepted or declined"});case err!=nil:writeJSON(w,409,map[string]string{"error":err.Error()});default:writeJSON(w,200,offer)}})
	mux.HandleFunc("POST /v1/contribution-offers/{offerId}/withdraw",func(w http.ResponseWriter,r *http.Request){if unavailable(w){return};p,ok:=authenticate(w,r,identity);if !ok{return};offer,err:=manager.WithdrawContributionOffer(r.Context(),r.PathValue("offerId"),p.Subject);if errors.Is(err,projects.ErrContributionOfferNotFound){writeJSON(w,404,map[string]string{"error":"open contribution offer not found for this identity"});return};if err!=nil{writeJSON(w,409,map[string]string{"error":err.Error()});return};writeJSON(w,200,offer)})
	mux.HandleFunc("POST /v1/projects/{id}/contribution-offers/{offerId}/fulfill",func(w http.ResponseWriter,r *http.Request){if unavailable(w){return};p,ok:=authenticate(w,r,identity);if !ok{return};allowed,err:=canManage(r,p);if err!=nil{writeJSON(w,500,map[string]string{"error":"unable to authorize contribution fulfilment"});return};if !allowed{writeJSON(w,403,map[string]string{"error":"project contribution steward role required"});return};offer,err:=manager.FulfillContributionOffer(r.Context(),r.PathValue("id"),r.PathValue("offerId"),p.Subject);if errors.Is(err,projects.ErrContributionOfferNotFound){writeJSON(w,404,map[string]string{"error":"accepted contribution offer not found"});return};if err!=nil{writeJSON(w,409,map[string]string{"error":err.Error()});return};writeJSON(w,200,offer)})
}
