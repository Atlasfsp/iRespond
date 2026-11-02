package needs

import (
	"context"
	"sync"
	"time"
)

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
type MemoryRepository struct {
	store   *Store
	mu      sync.Mutex
	intents map[string]creationReceipt
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{store: NewStore(), intents: map[string]creationReceipt{}}
}

func (m *MemoryRepository) Create(_ context.Context, n Need, key string) (Need, bool, error) {
	if n.SDGTags == nil {
		n.SDGTags = []int{}
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if key != "" {
		if receipt, ok := m.intents[key]; ok && time.Now().Before(receipt.expiresAt) {
			existing := receipt.need
			if !sameCreationIntent(existing, n) {
				return Need{}, false, ErrIdempotencyConflict
			}
			return existing, true, nil
		}
	}
	created := m.store.Create(n)
	if key != "" {
		m.intents[key] = creationReceipt{need: created, expiresAt: time.Now().Add(24 * time.Hour)}
	}
	return created, false, nil
}
func (m *MemoryRepository) Get(_ context.Context, id string) (Need, error) { return m.store.Get(id) }
func (m *MemoryRepository) Nearby(_ context.Context, lat, lng, radiusKm float64) ([]Need, error) {
	return m.store.Nearby(lat, lng, radiusKm), nil
}
func (m *MemoryRepository) Transition(_ context.Context, id string, state VerificationState, actor string) (Need, error) {
	n,err:=m.store.Get(id);if err!=nil{return Need{},err};if err=validateVerificationActor(n.ReporterID,actor,state);err!=nil{return Need{},err}
	return m.store.Transition(id, state)
}
func (m *MemoryRepository) Close() error { return nil }

type creationReceipt struct {
	need      Need
	expiresAt time.Time
}
