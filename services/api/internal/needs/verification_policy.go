package needs

import (
	"errors"
	"strings"
)

var ErrIndependentVerifierRequired = errors.New("independent authenticated verifier required")

func validateVerificationActor(reporter, actor string, next VerificationState) error {
	if strings.TrimSpace(actor) == "" {
		return ErrIndependentVerifierRequired
	}
	// Requesting review and raising a dispute do not certify the reporter's claim.
	if next != VerificationRequested && next != Disputed && reporter != "" && reporter == actor {
		return ErrIndependentVerifierRequired
	}
	return nil
}
