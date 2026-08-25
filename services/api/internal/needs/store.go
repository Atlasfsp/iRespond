package needs

import (
	"errors"
	"math"
	"sort"
	"sync"
	"time"
)

var ErrNotFound = errors.New("need not found")
var ErrInvalidTransition = errors.New("invalid verification transition")

type VerificationState string

const (
	Observed              VerificationState = "observed"
	VerificationRequested VerificationState = "verification_requested"
	CommunityConfirmed    VerificationState = "community_confirmed"
	InstitutionConfirmed  VerificationState = "institution_confirmed"
	ExpertConfirmed       VerificationState = "expert_confirmed"
	IndependentlyAudited  VerificationState = "independently_audited"
	GovernmentConfirmed   VerificationState = "government_confirmed"
	Disputed              VerificationState = "disputed"
	Rejected              VerificationState = "rejected"
)

type Need struct {
	ID                string            `json:"id"`
	Title             string            `json:"title"`
	Description       string            `json:"description"`
	Category          string            `json:"category"`
	Latitude          float64           `json:"latitude"`
	Longitude         float64           `json:"longitude"`
	ReporterID        string            `json:"reporterId"`
	VerificationState VerificationState `json:"verificationState"`
	SDGTags           []int             `json:"sdgTags"`
	CreatedAt         time.Time         `json:"createdAt"`
	UpdatedAt         time.Time         `json:"updatedAt"`
}

type Store struct {
	mu    sync.RWMutex
	items map[string]Need
}

func NewStore() *Store { return &Store{items: map[string]Need{}} }

func (s *Store) Create(n Need) Need {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	if n.VerificationState == "" { n.VerificationState = Observed }
	if n.CreatedAt.IsZero() { n.CreatedAt = now }
	n.UpdatedAt = now
	s.items[n.ID] = n
	return n
}

func (s *Store) Get(id string) (Need, error) {
	s.mu.RLock(); defer s.mu.RUnlock()
	n, ok := s.items[id]
	if !ok { return Need{}, ErrNotFound }
	return n, nil
}

func (s *Store) Nearby(lat, lng, radiusKm float64) []Need {
	s.mu.RLock(); defer s.mu.RUnlock()
	result := make([]Need, 0)
	for _, n := range s.items {
		if haversineKm(lat, lng, n.Latitude, n.Longitude) <= radiusKm { result = append(result, n) }
	}
	sort.Slice(result, func(i, j int) bool { return result[i].UpdatedAt.After(result[j].UpdatedAt) })
	return result
}

func (s *Store) Transition(id string, next VerificationState) (Need, error) {
	s.mu.Lock(); defer s.mu.Unlock()
	n, ok := s.items[id]
	if !ok { return Need{}, ErrNotFound }
	if !allowed(n.VerificationState, next) { return Need{}, ErrInvalidTransition }
	n.VerificationState = next
	n.UpdatedAt = time.Now().UTC()
	s.items[id] = n
	return n, nil
}

func allowed(current, next VerificationState) bool {
	if next == Disputed || next == Rejected { return current != Rejected }
	switch current {
	case Observed:
		return next == VerificationRequested
	case VerificationRequested:
		return next == CommunityConfirmed || next == InstitutionConfirmed || next == ExpertConfirmed
	case CommunityConfirmed, InstitutionConfirmed, ExpertConfirmed:
		return next == IndependentlyAudited || next == GovernmentConfirmed
	case Disputed:
		return next == VerificationRequested
	default:
		return false
	}
}

func haversineKm(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371.0
	toRad := func(v float64) float64 { return v * math.Pi / 180 }
	dLat := toRad(lat2-lat1); dLon := toRad(lon2-lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)
	return earthRadiusKm * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}
