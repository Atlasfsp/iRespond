package main

import (
  "encoding/json"
  "errors"
  "net/http"

  "github.com/Atlasfsp/iRespond/services/api/internal/auth"
  "github.com/Atlasfsp/iRespond/services/api/internal/evidence"
  "github.com/Atlasfsp/iRespond/services/api/internal/needs"
)

type beginEvidenceRequest struct {
  ContentType string `json:"contentType"`
  Filename string `json:"filename"`
  SizeBytes int64 `json:"sizeBytes"`
}
type reviewEvidenceRequest struct { Status string `json:"status"` }

func registerEvidenceRoutes(mux *http.ServeMux, identity auth.Verifier, needRepo needs.Repository, manager *evidence.Manager) {
  unavailable:=func(w http.ResponseWriter) bool { if manager==nil { writeJSON(w,http.StatusServiceUnavailable,map[string]string{"error":"evidence storage is not configured"}); return true }; return false }

  mux.HandleFunc("POST /v1/needs/{id}/evidence/uploads", func(w http.ResponseWriter,r *http.Request){
    if unavailable(w){return}
    principal,ok:=authenticate(w,r,identity);if !ok{return}
    if _,err:=needRepo.Get(r.Context(),r.PathValue("id"));errors.Is(err,needs.ErrNotFound){writeJSON(w,http.StatusNotFound,map[string]string{"error":"need not found"});return}else if err!=nil{writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to validate need"});return}
    var req beginEvidenceRequest;if err:=json.NewDecoder(r.Body).Decode(&req);err!=nil{writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid evidence upload request"});return}
    grant,err:=manager.Begin(r.Context(),newID(),r.PathValue("id"),principal.Subject,req.ContentType,req.Filename,req.SizeBytes);if err!=nil{writeJSON(w,http.StatusBadRequest,map[string]string{"error":err.Error()});return}
    writeJSON(w,http.StatusCreated,grant)
  })

  mux.HandleFunc("POST /v1/evidence/{id}/complete", func(w http.ResponseWriter,r *http.Request){
    if unavailable(w){return};principal,ok:=authenticate(w,r,identity);if !ok{return}
    item,err:=manager.Complete(r.Context(),r.PathValue("id"),principal.Subject);if errors.Is(err,evidence.ErrNotFound){writeJSON(w,http.StatusNotFound,map[string]string{"error":"evidence upload not found or already completed"});return};if err!=nil{writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to complete evidence upload"});return}
    writeJSON(w,http.StatusOK,item)
  })

  mux.HandleFunc("POST /v1/evidence/{id}/review", func(w http.ResponseWriter,r *http.Request){
    if unavailable(w){return};principal,ok:=authenticate(w,r,identity);if !ok{return}
    if !(principal.HasRole("trust_safety_admin")||principal.HasRole("evidence_reviewer")||principal.HasRole("community_verifier")){writeJSON(w,http.StatusForbidden,map[string]string{"error":"identity is not authorized to review evidence"});return}
    var req reviewEvidenceRequest;if err:=json.NewDecoder(r.Body).Decode(&req);err!=nil{writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid evidence review request"});return}
    item,err:=manager.Review(r.Context(),r.PathValue("id"),req.Status);if errors.Is(err,evidence.ErrNotFound){writeJSON(w,http.StatusNotFound,map[string]string{"error":"pending evidence not found"});return};if err!=nil{writeJSON(w,http.StatusBadRequest,map[string]string{"error":err.Error()});return}
    writeJSON(w,http.StatusOK,item)
  })

  mux.HandleFunc("GET /v1/needs/{id}/evidence", func(w http.ResponseWriter,r *http.Request){
    if unavailable(w){return}
    items,err:=manager.ListAvailable(r.Context(),r.PathValue("id"));if err!=nil{writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"unable to list evidence"});return}
    type publicItem struct { Evidence evidence.Item `json:"evidence"`; ReadURL string `json:"readUrl"` }
    out:=make([]publicItem,0,len(items));for _,item:=range items{u,err:=manager.ReadURL(r.Context(),item);if err!=nil{continue};out=append(out,publicItem{Evidence:item,ReadURL:u})}
    writeJSON(w,http.StatusOK,out)
  })
}
