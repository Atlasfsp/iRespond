package actionintelligence

import "testing"

func TestMatchingRequiresConsentTenantAndReviewedNeed(t *testing.T) {
	n := Need{TenantID: "ngo-a", ID: "need-1", Verified: true, Skills: []string{"translation"}, Minutes: 30, Remote: true}
	p := Ability{TenantID: "ngo-a", Subject: "person", OptIn: true, Skills: []string{"translation"}, AvailableMinutes: 60, Remote: true}
	if got := Match(n, []Ability{p}); len(got) != 1 || !got[0].RequiresHumanApproval || got[0].SourceNeedID != "need-1" {
		t.Fatalf("expected sourced proposal: %+v", got)
	}
	for _, mutate := range []func(*Ability){func(p *Ability) { p.OptIn = false }, func(p *Ability) { p.TenantID = "other" }, func(p *Ability) { p.AvailableMinutes = 10 }, func(p *Ability) { p.Skills = []string{"coding"} }} {
		q := p
		mutate(&q)
		if len(Match(n, []Ability{q})) != 0 {
			t.Fatal("ineligible ability disclosed")
		}
	}
	n.Verified = false
	if len(Match(n, []Ability{p})) != 0 {
		t.Fatal("unreviewed need matched")
	}
}
func TestMatchingIsDeterministicAndDoesNotUseSensitiveAttributes(t *testing.T) {
	n := Need{TenantID: "a", ID: "n", Verified: true, Remote: true, Minutes: 15, Skills: []string{" Writing ", "writing"}}
	a := Ability{TenantID: "a", Subject: "z", OptIn: true, Remote: true, AvailableMinutes: 15, Skills: []string{"WRITING"}}
	b := a
	b.Subject = "a"
	got := Match(n, []Ability{a, b, a})
	if len(got) != 2 || got[0].Subject != "a" || got[0].Score != 1 {
		t.Fatalf("unstable or duplicated matching: %+v", got)
	}
	n.TenantID = ""
	if len(Match(n, []Ability{a})) != 0 {
		t.Fatal("missing tenant accepted")
	}
}
func TestOnsiteRequiresExplicitAreaConsent(t *testing.T) {
	n := Need{TenantID: "a", ID: "n", Verified: true, Area: "coarse-zone", Minutes: 15, Skills: []string{"repair"}}
	a := Ability{TenantID: "a", Subject: "p", OptIn: true, AvailableMinutes: 30, Skills: []string{"repair"}}
	if len(Match(n, []Ability{a})) != 0 {
		t.Fatal("onsite match without area consent")
	}
	a.AllowedAreas = []string{"coarse-zone"}
	if len(Match(n, []Ability{a})) != 1 {
		t.Fatal("consented onsite match missing")
	}
}
