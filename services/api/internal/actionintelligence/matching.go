// Package actionintelligence implements the consent-based deterministic fallback.
// It produces proposals only: no assignment, outreach, verification or role writes.
package actionintelligence

import (
	"sort"
	"strings"
)

type Need struct {
	TenantID, ID, Area string
	Verified, Remote   bool
	Skills             []string
	Minutes            int
}
type Ability struct {
	TenantID, Subject    string
	OptIn, Remote        bool
	Skills, AllowedAreas []string
	AvailableMinutes     int
}
type Proposal struct {
	Subject               string   `json:"subject"`
	SourceNeedID          string   `json:"sourceNeedId"`
	MatchedSkills         []string `json:"matchedSkills"`
	Score                 float64  `json:"score"`
	RequiresHumanApproval bool     `json:"requiresHumanApproval"`
	Method                string   `json:"method"`
}

// Match must receive authorized, tenant-scoped projections from the gateway.
// Coarse areas require explicit opt-in; precise location and sensitive attributes
// are deliberately absent. Scores express skill overlap, never impact or worth.
func Match(n Need, abilities []Ability) []Proposal {
	result := []Proposal{}
	skills := normalize(n.Skills)
	if n.TenantID == "" || n.ID == "" || !n.Verified || n.Minutes <= 0 || len(skills) == 0 {
		return result
	}
	seen := map[string]bool{}
	for _, a := range abilities {
		if a.TenantID != n.TenantID || a.Subject == "" || !a.OptIn || a.AvailableMinutes < n.Minutes || seen[a.Subject] {
			continue
		}
		if n.Remote && !a.Remote {
			continue
		}
		if !n.Remote && (n.Area == "" || !contains(a.AllowedAreas, n.Area)) {
			continue
		}
		matched := []string{}
		available := normalize(a.Skills)
		for _, s := range skills {
			if contains(available, s) {
				matched = append(matched, s)
			}
		}
		if len(matched) == 0 {
			continue
		}
		seen[a.Subject] = true
		result = append(result, Proposal{Subject: a.Subject, SourceNeedID: n.ID, MatchedSkills: matched, Score: float64(len(matched)) / float64(len(skills)), RequiresHumanApproval: true, Method: "deterministic-skill-overlap.v1"})
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Score == result[j].Score {
			return result[i].Subject < result[j].Subject
		}
		return result[i].Score > result[j].Score
	})
	return result
}
func normalize(values []string) []string {
	result := []string{}
	seen := map[string]bool{}
	for _, s := range values {
		s = strings.ToLower(strings.TrimSpace(s))
		if s != "" && !seen[s] {
			seen[s] = true
			result = append(result, s)
		}
	}
	sort.Strings(result)
	return result
}
func contains(values []string, s string) bool {
	for _, v := range values {
		if v == s {
			return true
		}
	}
	return false
}
