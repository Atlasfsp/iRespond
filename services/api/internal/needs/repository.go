package needs

import "context"

// Repository is the authoritative server-side persistence boundary for community needs.
// Implementations must preserve verification transition rules and retry-safe semantics.
type Repository interface {
	Create(context.Context, Need, string) (Need, bool, error)
	Get(context.Context, string) (Need, error)
	Nearby(context.Context, float64, float64, float64) ([]Need, error)
	Transition(context.Context, string, VerificationState, string) (Need, error)
	Close() error
}
