package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	"github.com/Atlasfsp/iRespond/services/api/internal/projects"
)

type convertProjectRequest struct {
	Title            string `json:"title"`
	Description      string `json:"description"`
	OwnerCommunityID string `json:"ownerCommunityId"`
}

func registerProjectRoutes(mux *http.ServeMux, identity auth.Verifier, manager *projects.Manager) {
	unavailable:=func(w http.ResponseWriter)bool{if manager==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"project service is not configured"});return true};return false}
	mux.HandleFunc("POST /v1/needs/{id}/project",func(w http.ResponseWriter,r *http.Request){
		if unavailable(w){return};principal,ok:=authenticate(w,r,identity);if !ok{return}
		if !(principal.HasRole("project_steward")||principal.HasRole("community_verifier")||principal.HasRole("institution_verifier")||principal.HasRole("trust_safety_admin")){writeJSON(w,http.StatusForbidden,map[string]string{"error":"identity is not authorized to convert needs into projects"});return}
		var req convertProjectRequest;if err:=json.NewDecoder(r.Body).Decode(&req);err!=nil{writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid project conversion request"});return}
		p,err:=manager.Convert(r.Context(),newID(),r.PathValue("id"),strings.TrimSpace(req.Title),strings.TrimSpace(req.Description),strings.TrimSpace(req.OwnerCommunityID),principal.Subject)
		switch{case errors.Is(err,projects.ErrNeedNotFound):writeJSON(w,http.StatusNotFound,map[string]string{"error":"need not found"});case errors.Is(err,projects.ErrNeedNotVerified):writeJSON(w,http.StatusConflict,map[string]string{"error":"need must be verified before project conversion"});case errors.Is(err,projects.ErrAlreadyConverted):writeJSON(w,http.StatusConflict,map[string]string{"error":"need already has an action project"});case err!=nil:writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to create action project"});default:writeJSON(w,http.StatusCreated,p)}
	})
	mux.HandleFunc("GET /v1/needs/{id}/project",func(w http.ResponseWriter,r *http.Request){
		if unavailable(w){return};p,err:=manager.FindByNeed(r.Context(),r.PathValue("id"));if errors.Is(err,projects.ErrProjectNotFound){writeJSON(w,http.StatusNotFound,map[string]string{"error":"action project not found"});return};if err!=nil{writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to load action project"});return};writeJSON(w,http.StatusOK,p)
	})
	mux.HandleFunc("GET /v1/projects/{id}",func(w http.ResponseWriter,r *http.Request){
		if unavailable(w){return};detail,err:=manager.Get(r.Context(),r.PathValue("id"));if errors.Is(err,projects.ErrProjectNotFound){writeJSON(w,http.StatusNotFound,map[string]string{"error":"project not found"});return};if err!=nil{writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to load project"});return};writeJSON(w,http.StatusOK,detail)
	})
}
