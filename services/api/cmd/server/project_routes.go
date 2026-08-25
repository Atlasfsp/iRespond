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
  "github.com/Atlasfsp/iRespond/services/api/internal/projects"
)

type createProjectRequest struct {
  Title string `json:"title"`
  Summary string `json:"summary"`
  Currency string `json:"currency"`
  EstimatedBudgetMinor *int64 `json:"estimatedBudgetMinor"`
  TargetDays *int `json:"targetDays"`
}

func projectServiceFromEnvironment(ctx context.Context)(*projects.Service,string){db:=strings.TrimSpace(os.Getenv("DATABASE_URL"));if db==""{return nil,"unconfigured-fail-closed"};svc,err:=projects.New(ctx,db);if err!=nil{log.Printf("project service unavailable: %v",err);return nil,"unavailable-fail-closed"};return svc,"postgres"}

func registerProjectRoutes(mux *http.ServeMux,identity auth.Verifier,service *projects.Service){
  mux.HandleFunc("POST /v1/needs/{id}/projects",func(w http.ResponseWriter,r *http.Request){
    principal,ok:=authenticate(w,r,identity);if !ok{return};if service==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"project service is not configured"});return}
    var req createProjectRequest;if err:=json.NewDecoder(r.Body).Decode(&req);err!=nil{writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid project request"});return}
    project,err:=service.CreateFromNeed(r.Context(),projects.CreateInput{NeedID:r.PathValue("id"),CreatedBy:principal.Subject,Title:req.Title,Summary:req.Summary,Currency:req.Currency,EstimatedBudgetMinor:req.EstimatedBudgetMinor,TargetDays:req.TargetDays})
    switch{case errors.Is(err,projects.ErrNeedNotFound):writeJSON(w,http.StatusNotFound,map[string]string{"error":"need not found"});case errors.Is(err,projects.ErrNeedNotConfirmed):writeJSON(w,http.StatusConflict,map[string]string{"error":"need must be confirmed before project conversion"});case errors.Is(err,projects.ErrProjectExists):writeJSON(w,http.StatusConflict,map[string]string{"error":"an action project already exists for this need"});case err!=nil:log.Printf("create project: %v",err);writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to create action project"});default:writeJSON(w,http.StatusCreated,project)}
  })
  mux.HandleFunc("GET /v1/projects/{id}",func(w http.ResponseWriter,r *http.Request){if service==nil{writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"project service is not configured"});return};project,err:=service.Get(r.Context(),r.PathValue("id"));if errors.Is(err,projects.ErrProjectNotFound){writeJSON(w,http.StatusNotFound,map[string]string{"error":"project not found"});return};if err!=nil{writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to load project"});return};writeJSON(w,http.StatusOK,project)})
}
