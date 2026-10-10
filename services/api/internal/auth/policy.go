package auth

import "github.com/Atlasfsp/iRespond/services/api/internal/needs"

// CanTransition separates the public action of requesting verification from
// privileged confirmation, audit, government, dispute, and rejection actions.
func CanTransition(p Principal, next needs.VerificationState) bool {
	switch next {
	case needs.VerificationRequested:
		return p.Subject != ""
	case needs.CommunityConfirmed:
		return anyRole(p, "community_verifier", "trust_safety_admin")
	case needs.InstitutionConfirmed:
		return anyRole(p, "institution_verifier", "trust_safety_admin")
	case needs.ExpertConfirmed:
		return anyRole(p, "expert_verifier", "trust_safety_admin")
	case needs.IndependentlyAudited:
		return anyRole(p, "impact_auditor", "trust_safety_admin")
	case needs.GovernmentConfirmed:
		return anyRole(p, "government_verifier", "trust_safety_admin")
	case needs.Disputed:
		return anyRole(p, "community_verifier", "institution_verifier", "expert_verifier", "impact_auditor", "government_verifier", "trust_safety_admin")
	case needs.Rejected:
		return anyRole(p, "trust_safety_admin")
	default:
		return false
	}
}

// CanReviewEvidence protects both evidence moderation and the signed byte-access
// path with one policy. Authentication alone never grants evidence visibility.
func CanReviewEvidence(p Principal) bool {
	return anyRole(p, "community_verifier", "evidence_reviewer", "trust_safety_admin")
}

func anyRole(p Principal, roles ...string) bool {
	for _, role := range roles { if p.HasRole(role) { return true } }
	return false
}
