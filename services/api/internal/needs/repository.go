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

// MemoryRepository keeps the current in-process implementation available for tests and
// development when DATABASE_URL is absent. Production-like environments should use PostgresRepository.
type MemoryRepository struct{ store *Store }

func NewMemoryRepository() *MemoryRepository { return &MemoryRepository{store: NewStore()} }

func (m *MemoryRepository) Create(_ context.Context, n Need, _ string) (Need, bool, error) {
	return m.store.Create(n), false, nil
}
func (m *MemoryRepository) Get(_ context.Context, id string) (Need, error) { return m.store.Get(id) }
func (m *MemoryRepository) Nearby(_ context.Context, lat, lng, radiusKm float64) ([]Need, error) {
	return m.store.Nearby(lat, lng, radiusKm), nil
}
func (m *MemoryRepository) Transition(_ context.Context, id string, state VerificationState, _ string) (Need, error) {
	return m.store.Transition(id, state)
}
func (m *MemoryRepository) Close() error { return nil }
