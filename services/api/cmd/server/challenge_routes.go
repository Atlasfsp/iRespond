package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/Atlasfsp/iRespond/services/api/internal/auth"
	"github.com/Atlasfsp/iRespond/services/api/internal/challenges"
)

func challengeActorFromPrincipal(p auth.Principal) challenges.Actor {
	return challenges.Actor{
		Subject:   p.Subject,
		ActorType: p.ActorType,
		TenantID:  p.TenantID,
		Roles:     p.Roles,
	}
}

func writeChallengeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, challenges.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
	case errors.Is(err, challenges.ErrForbidden),
		errors.Is(err, challenges.ErrHumanActorRequired),
		errors.Is(err, challenges.ErrSelfReviewForbidden),
		errors.Is(err, challenges.ErrSelfConflictClearance):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
	case errors.Is(err, challenges.ErrDuplicateApproval),
		errors.Is(err, challenges.ErrInsufficientRuleApprovals),
		errors.Is(err, challenges.ErrJudgeConflictBlocked),
		errors.Is(err, challenges.ErrSubmissionDeadlinePassed),
		errors.Is(err, challenges.ErrAppealHoldActive),
		errors.Is(err, challenges.ErrInsufficientScorecardQuorum),
		errors.Is(err, challenges.ErrUnverifiedCashFulfillment),
		errors.Is(err, challenges.ErrGuardianConsentRequired),
		errors.Is(err, challenges.ErrTeamCapacityExceeded),
		errors.Is(err, challenges.ErrIdempotencyConflict),
		errors.Is(err, challenges.ErrInvalidState):
		writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
	case errors.Is(err, challenges.ErrRubricWeightMismatch),
		errors.Is(err, challenges.ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	default:
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to process challenge request"})
	}
}

func registerChallengeRoutes(mux *http.ServeMux, identity auth.Verifier) func() {
	svc := challenges.NewMemoryService()

	mux.HandleFunc("GET /v1/challenges", func(w http.ResponseWriter, r *http.Request) {
		p, _ := optionalPrincipal(r.Context(), r, identity)
		items := svc.ListPublishedChallenges(r.Context(), challengeActorFromPrincipal(p))
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	})

	mux.HandleFunc("POST /v1/challenges", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.CreateChallengeInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid challenge creation payload"})
			return
		}
		out, err := svc.CreateChallenge(r.Context(), challengeActorFromPrincipal(p), in, r.Header.Get("Idempotency-Key"))
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("GET /v1/challenges/{challengeId}", func(w http.ResponseWriter, r *http.Request) {
		p, _ := optionalPrincipal(r.Context(), r, identity)
		out, err := svc.GetChallenge(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"))
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/rule-approvals", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in struct {
			RulesSHA256 string `json:"rulesSha256"`
			Decision    string `json:"decision"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid rule approval payload"})
			return
		}
		out, err := svc.ApproveRules(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), strings.TrimSpace(in.RulesSHA256), strings.TrimSpace(in.Decision), r.Header.Get("Idempotency-Key"))
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/publish", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		out, err := svc.PublishChallenge(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), r.Header.Get("Idempotency-Key"))
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/entries", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.ApplyInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid challenge application payload"})
			return
		}
		out, err := svc.Apply(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), in, r.Header.Get("Idempotency-Key"))
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("GET /v1/me/challenge-entries", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		items := svc.ListMyEntries(r.Context(), challengeActorFromPrincipal(p))
		writeJSON(w, http.StatusOK, items)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/entries/{entryId}/team-members", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.TeamMemberInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid team member payload"})
			return
		}
		out, err := svc.ManageTeamMember(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), r.PathValue("entryId"), in)
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/entries/{entryId}/guardian-consents", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.GuardianConsentInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid guardian consent payload"})
			return
		}
		out, err := svc.RecordGuardianConsent(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), r.PathValue("entryId"), in)
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/entries/{entryId}/eligibility-decisions", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.EligibilityDecisionInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid eligibility decision payload"})
			return
		}
		out, err := svc.DecideEligibility(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), r.PathValue("entryId"), in)
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/entries/{entryId}/submissions", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.SubmissionInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid submission payload"})
			return
		}
		out, err := svc.SubmitRoundEntry(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), r.PathValue("entryId"), in, r.Header.Get("Idempotency-Key"))
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/judge-assignments", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.AssignJudgeInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid judge assignment payload"})
			return
		}
		out, err := svc.AssignJudge(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), in)
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("GET /v1/me/challenge-judge-assignments", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		items := svc.ListMyJudgeAssignments(r.Context(), challengeActorFromPrincipal(p))
		writeJSON(w, http.StatusOK, items)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/judge-assignments/{assignmentId}/conflict", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.ConflictInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid judge conflict payload"})
			return
		}
		out, err := svc.DeclareOrResolveConflict(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), r.PathValue("assignmentId"), in)
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/judge-assignments/{assignmentId}/scorecards", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.ScorecardInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid scorecard payload"})
			return
		}
		out, err := svc.SubmitScorecard(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), r.PathValue("assignmentId"), in, r.Header.Get("Idempotency-Key"))
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/rounds/{roundId}/decisions", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.RoundDecisionInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid round decision payload"})
			return
		}
		out, err := svc.RecordOrPublishDecision(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), r.PathValue("roundId"), in, r.Header.Get("Idempotency-Key"))
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/appeals", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.AppealInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid appeal payload"})
			return
		}
		out, err := svc.FileOrResolveAppeal(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), in)
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/sponsors", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.SponsorInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid sponsor commitment payload"})
			return
		}
		out, err := svc.RecordSponsorCommitment(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), in)
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/awards", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.AwardInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid award payload"})
			return
		}
		out, err := svc.CreateOrPublishAward(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), in)
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/awards/{awardId}/fulfillments", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.PrizeFulfillmentInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid prize fulfillment payload"})
			return
		}
		out, err := svc.RecordPrizeFulfillment(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), r.PathValue("awardId"), in)
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	mux.HandleFunc("POST /v1/challenges/{challengeId}/entries/{entryId}/project-link", func(w http.ResponseWriter, r *http.Request) {
		p, ok := authenticate(w, r, identity)
		if !ok {
			return
		}
		var in challenges.ProjectLinkInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid project link payload"})
			return
		}
		out, err := svc.LinkProject(r.Context(), challengeActorFromPrincipal(p), r.PathValue("challengeId"), r.PathValue("entryId"), in)
		if err != nil {
			writeChallengeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	return func() {
		svc.Close()
	}
}
