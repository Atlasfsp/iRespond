// Package programmes contains institution programme invariants. It is internal
// until tenant membership and Hasura command authorization are integrated.
package programmes

import "errors"

type Programme struct {
	TenantID, ID, OwnerID string
	Participants          []string
}
type Invitation struct {
	TenantID, ProgrammeID, Subject, InvitedBy, Role string
}

// Accept validates a participant invitation against the authenticated subject.
// A future command adapter must load the invitation from authoritative storage,
// validate active membership/expiry with SpiceDB, and persist atomically with audit.
func (p *Programme) Accept(inv Invitation, authenticatedSubject string) error {
	if p.TenantID == "" || p.ID == "" || p.OwnerID == "" || inv.TenantID != p.TenantID || inv.ProgrammeID != p.ID {
		return errors.New("programme scope mismatch")
	}
	if authenticatedSubject == "" || inv.Subject != authenticatedSubject || inv.InvitedBy != p.OwnerID || inv.Subject == inv.InvitedBy || inv.Role != "participant" {
		return errors.New("invalid participant invitation")
	}
	for _, subject := range p.Participants {
		if subject == inv.Subject {
			return errors.New("participant already enrolled")
		}
	}
	p.Participants = append(p.Participants, inv.Subject)
	return nil
}
