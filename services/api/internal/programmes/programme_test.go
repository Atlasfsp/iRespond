package programmes

import "testing"

func TestProgrammeInvitationsCannotGrantCrossTenantOrSelfAssignedMembership(t *testing.T) {
	p := Programme{TenantID: "ngo", ID: "programme", OwnerID: "owner"}
	bad := Invitation{TenantID: "other", ProgrammeID: "programme", Subject: "volunteer", InvitedBy: "owner", Role: "participant"}
	if p.Accept(bad, "volunteer") == nil {
		t.Fatal("cross-tenant invitation accepted")
	}
	bad.TenantID = "ngo"
	bad.InvitedBy = "volunteer"
	if p.Accept(bad, "volunteer") == nil {
		t.Fatal("self-invitation accepted")
	}
	bad.InvitedBy = "owner"
	bad.Role = "admin"
	if p.Accept(bad, "volunteer") == nil {
		t.Fatal("participant invite escalated")
	}
	bad.Role = "participant"
	if p.Accept(bad, "other-user") == nil {
		t.Fatal("wrong subject accepted invitation")
	}
	if err := p.Accept(bad, "volunteer"); err != nil {
		t.Fatal(err)
	}
	if len(p.Participants) != 1 {
		t.Fatal("participant missing")
	}
	if p.Accept(bad, "volunteer") == nil {
		t.Fatal("replayed invitation accepted")
	}
}
