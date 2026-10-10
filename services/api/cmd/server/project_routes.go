package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	"github.com/Atlasfsp/iRespond/services/api/internal/projects"
)

type convertProjectRequest struct {
	Title            string `json:"title"`
	Description      string `json:"description"`
	OwnerCommunityID string `json:"ownerCommunityId"`
}
type contributionNeedRequest struct {
	Kind         string `json:"kind"`
	Description  string `json:"description"`
	QuantityNote string `json:"quantityNote"`
}
type contributionOfferRequest struct {
	Note             string `json:"note"`
	AvailabilityNote string `json:"availabilityNote"`
}
type milestoneRequest struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Sequence    int        `json:"sequence"`
	TargetAt    *time.Time `json:"targetAt"`
}
type stateRequest struct{ State string `json:"state"` }
type roleInviteRequest struct {
	ActorID string `json:"actorId"`
	Role    string `json:"role"`
}
type projectPermissions struct {
	CanManageProject            bool `json:"canManageProject"`
	CanManageMilestones         bool `json:"canManageMilestones"`
	CanValidateMilestones       bool `json:"canValidateMilestones"`
	CanManageRoles              bool `json:"canManageRoles"`
	CanManageContributions      bool `json:"canManageContributions"`
	CanPublishContributionNeeds bool `json:"canPublishContributionNeeds"`
	CanManageFunding            bool `json:"canManageFunding"`
}

func milestoneTransitionAuthorized(canManage, canValidate bool, target string) bool {
	if target == "validated" { return canValidate }
	return canManage
}

func registerProjectRoutes(mux *http.ServeMux, identity auth.Verifier, manager *projects.Manager) {
	unavailable := func(w http.ResponseWriter) bool {
		if manager == nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "project service is not configured"})
			return true
		}
		return false
	}
	isManager := func(r *http.Request, p auth.Principal) (bool, error) {
		if p.HasRole("trust_safety_admin") || p.HasRole("project_steward") {
			return true, nil
		}
		return manager.HasAnyProjectRole(r.Context(), r.PathValue("id"), p.Subject, "project_manager", "community_steward")
	}
	canManageContributions := func(r *http.Request, p auth.Principal) (bool, error) {
		allowed, err := isManager(r, p)
		if err != nil || allowed {
			return allowed, err
		}
		return manager.HasAnyProjectRole(r.Context(), r.PathValue("id"), p.Subject, "volunteer_lead")
	}
	canValidateMilestones := func(r *http.Request, p auth.Principal) (bool, error) {
		if p.HasRole("community_verifier") || p.HasRole("institution_verifier") || p.HasRole("expert_verifier") || p.HasRole("impact_auditor") || p.HasRole("trust_safety_admin") {
			return true, nil
		}
		return manager.HasAnyProjectRole(r.Context(), r.PathValue("id"), p.Subject, "verifier")
	}

	mux.HandleFunc("POST /v1/needs/{id}/project", func(w http.ResponseWriter, r *http.Request) {
		if unavailable(w) { return }
		principal, ok := authenticate(w, r, identity); if !ok { return }
		if !(principal.HasRole("project_steward") || principal.HasRole("community_verifier") || principal.HasRole("institution_verifier") || principal.HasRole("trust_safety_admin")) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "identity is not authorized to convert needs into projects"}); return
		}
		var req convertProjectRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid project conversion request"}); return }
		p, err := manager.Convert(r.Context(), newID(), r.PathValue("id"), strings.TrimSpace(req.Title), strings.TrimSpace(req.Description), strings.TrimSpace(req.OwnerCommunityID), principal.Subject)
		switch {
		case errors.Is(err, projects.ErrNeedNotFound): writeJSON(w, http.StatusNotFound, map[string]string{"error": "need not found"})
		case errors.Is(err, projects.ErrNeedNotVerified): writeJSON(w, http.StatusConflict, map[string]string{"error": "need must be verified before project conversion"})
		case errors.Is(err, projects.ErrAlreadyConverted): writeJSON(w, http.StatusConflict, map[string]string{"error": "need already has an action project"})
		case err != nil: writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to create action project"})
		default: writeJSON(w, http.StatusCreated, p)
		}
	})
	mux.HandleFunc("GET /v1/needs/{id}/project", func(w http.ResponseWriter, r *http.Request) {
		if unavailable(w) { return }
		p, err := manager.FindByNeed(r.Context(), r.PathValue("id"))
		if errors.Is(err, projects.ErrProjectNotFound) { writeJSON(w, http.StatusNotFound, map[string]string{"error": "action project not found"}); return }
		if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to load action project"}); return }
		writeJSON(w, http.StatusOK, p)
	})
	mux.HandleFunc("GET /v1/projects/{id}", func(w http.ResponseWriter, r *http.Request) {
		if unavailable(w) { return }
		detail, err := manager.Get(r.Context(), r.PathValue("id"))
		if errors.Is(err, projects.ErrProjectNotFound) { writeJSON(w, http.StatusNotFound, map[string]string{"error": "project not found"}); return }
		if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to load project"}); return }
		principal, authenticated := optionalPrincipal(r.Context(), r, identity)
		if !authenticated { writeJSON(w, http.StatusOK, detail); return }
		manage, err := isManager(r, principal); if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to authorize project"}); return }
		contributions, err := canManageContributions(r, principal); if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to authorize project contributions"}); return }
		validate, err := canValidateMilestones(r, principal); if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to authorize project validation"}); return }
		writeJSON(w, http.StatusOK, map[string]any{
			"project": detail.Project,
			"milestones": detail.Milestones,
			"contributionNeeds": detail.ContributionNeeds,
			"permissions": projectPermissions{CanManageProject: manage, CanManageMilestones: manage, CanValidateMilestones: validate, CanManageRoles: manage, CanManageContributions: contributions, CanPublishContributionNeeds: manage, CanManageFunding: manage},
		})
	})
	mux.HandleFunc("POST /v1/projects/{id}/contribution-needs", func(w http.ResponseWriter, r *http.Request) {
		if unavailable(w) { return }
		principal, ok := authenticate(w, r, identity); if !ok { return }
		allowed, err := isManager(r, principal); if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to authorize contribution plan"}); return }
		if !allowed { writeJSON(w, http.StatusForbidden, map[string]string{"error": "project manager or community steward role required"}); return }
		var req contributionNeedRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid contribution need"}); return }
		c, err := manager.AddContributionNeed(r.Context(), newID(), r.PathValue("id"), req.Kind, req.Description, req.QuantityNote)
		switch {
		case errors.Is(err, projects.ErrProjectNotFound): writeJSON(w, http.StatusNotFound, map[string]string{"error": "project not found"})
		case errors.Is(err, projects.ErrInvalidContributionKind): writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid contribution kind"})
		case err != nil: writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		default: writeJSON(w, http.StatusCreated, c)
		}
	})
	mux.HandleFunc("POST /v1/projects/{id}/contribution-needs/{needId}/offers", func(w http.ResponseWriter, r *http.Request) {
		if unavailable(w) { return }
		principal, ok := authenticate(w, r, identity); if !ok { return }
		var req contributionOfferRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid contribution offer"}); return }
		offer, err := manager.OfferContribution(r.Context(), newID(), r.PathValue("id"), r.PathValue("needId"), principal.Subject, req.Note, req.AvailabilityNote)
		switch {
		case errors.Is(err, projects.ErrContributionNeedNotFound): writeJSON(w, http.StatusNotFound, map[string]string{"error": "contribution need not found"})
		case err != nil: writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
		default: writeJSON(w, http.StatusCreated, offer)
		}
	})
	mux.HandleFunc("POST /v1/projects/{id}/milestones", func(w http.ResponseWriter, r *http.Request) {
		if unavailable(w) { return }
		p, ok := authenticate(w, r, identity); if !ok { return }
		allowed, err := isManager(r, p); if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to authorize project action"}); return }
		if !allowed { writeJSON(w, http.StatusForbidden, map[string]string{"error": "project manager or steward role required"}); return }
		var req milestoneRequest
		if json.NewDecoder(r.Body).Decode(&req) != nil { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid milestone"}); return }
		v, err := manager.AddMilestone(r.Context(), newID(), r.PathValue("id"), req.Title, req.Description, req.Sequence, req.TargetAt)
		if err != nil { writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()}); return }
		writeJSON(w, http.StatusCreated, v)
	})
	mux.HandleFunc("POST /v1/projects/{id}/milestones/{milestoneId}/transition", func(w http.ResponseWriter, r *http.Request) {
		if unavailable(w) { return }
		p, ok := authenticate(w, r, identity); if !ok { return }
		allowed, err := isManager(r, p); if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to authorize project action"}); return }
		var req stateRequest
		if json.NewDecoder(r.Body).Decode(&req) != nil { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid milestone transition"}); return }
		canValidate, err := canValidateMilestones(r, p); if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to authorize milestone validation"}); return }
		if !milestoneTransitionAuthorized(allowed, canValidate, req.State) { writeJSON(w, http.StatusForbidden, map[string]string{"error": "milestone transition is not authorized"}); return }
		v, err := manager.TransitionMilestone(r.Context(), r.PathValue("id"), r.PathValue("milestoneId"), req.State, p.Subject, canValidate)
		if err != nil { writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()}); return }
		writeJSON(w, http.StatusOK, v)
	})
	mux.HandleFunc("POST /v1/projects/{id}/roles/invite", func(w http.ResponseWriter, r *http.Request) {
		if unavailable(w) { return }
		p, ok := authenticate(w, r, identity); if !ok { return }
		allowed, err := isManager(r, p); if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to authorize project action"}); return }
		if !allowed { writeJSON(w, http.StatusForbidden, map[string]string{"error": "project manager or steward role required"}); return }
		var req roleInviteRequest
		if json.NewDecoder(r.Body).Decode(&req) != nil || strings.TrimSpace(req.ActorID) == "" { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "actorId and role are required"}); return }
		v, err := manager.InviteRole(r.Context(), newID(), r.PathValue("id"), strings.TrimSpace(req.ActorID), req.Role, p.Subject)
		if err != nil { writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()}); return }
		writeJSON(w, http.StatusCreated, v)
	})
	mux.HandleFunc("POST /v1/project-role-invites/{inviteId}/accept", func(w http.ResponseWriter, r *http.Request) {
		if unavailable(w) { return }
		p, ok := authenticate(w, r, identity); if !ok { return }
		v, err := manager.AcceptRole(r.Context(), r.PathValue("inviteId"), p.Subject)
		if errors.Is(err, projects.ErrRoleInviteNotFound) { writeJSON(w, http.StatusNotFound, map[string]string{"error": "pending invite not found for this identity"}); return }
		if err != nil { writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()}); return }
		writeJSON(w, http.StatusOK, v)
	})
	mux.HandleFunc("POST /v1/projects/{id}/transition", func(w http.ResponseWriter, r *http.Request) {
		if unavailable(w) { return }
		p, ok := authenticate(w, r, identity); if !ok { return }
		allowed, err := isManager(r, p); if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to authorize project action"}); return }
		if !allowed { writeJSON(w, http.StatusForbidden, map[string]string{"error": "project manager or steward role required"}); return }
		var req stateRequest
		if json.NewDecoder(r.Body).Decode(&req) != nil { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid project transition"}); return }
		v, err := manager.TransitionProject(r.Context(), r.PathValue("id"), req.State, p.Subject)
		if err != nil { writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()}); return }
		writeJSON(w, http.StatusOK, v)
	})
}

func optionalPrincipal(ctx context.Context, r *http.Request, verifier auth.Verifier) (auth.Principal, bool) {
	if verifier == nil { return auth.Principal{}, false }
	token, err := auth.BearerToken(r); if err != nil { return auth.Principal{}, false }
	principal, err := verifier.Verify(ctx, token); if err != nil { return auth.Principal{}, false }
	return principal, true
}
