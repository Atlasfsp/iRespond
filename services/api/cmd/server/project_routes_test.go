package main

import "testing"

func TestMilestoneTransitionAuthority(t *testing.T) {
	tests := []struct {
		name        string
		manage      bool
		validate    bool
		target      string
		wantAllowed bool
	}{
		{name: "manager advances delivery", manage: true, target: "in_progress", wantAllowed: true},
		{name: "manager cannot self-validate", manage: true, target: "validated", wantAllowed: false},
		{name: "verifier validates submission", validate: true, target: "validated", wantAllowed: true},
		{name: "verifier cannot advance delivery", validate: true, target: "in_progress", wantAllowed: false},
		{name: "verifier cannot cancel delivery", validate: true, target: "cancelled", wantAllowed: false},
		{name: "unassigned identity denied", target: "ready", wantAllowed: false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := milestoneTransitionAuthorized(test.manage, test.validate, test.target); got != test.wantAllowed {
				t.Fatalf("authorized=%v want=%v", got, test.wantAllowed)
			}
		})
	}
}
