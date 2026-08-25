package needs

import "testing"

func TestVerificationTransitions(t *testing.T) {
	s := NewStore()
	n := s.Create(Need{ID:"n1", Title:"Broken water point", Latitude:6.52, Longitude:3.37})
	if n.VerificationState != Observed { t.Fatalf("expected observed, got %s", n.VerificationState) }
	if _, err := s.Transition("n1", CommunityConfirmed); err == nil { t.Fatal("expected invalid direct transition") }
	if _, err := s.Transition("n1", VerificationRequested); err != nil { t.Fatalf("request verification: %v", err) }
	if _, err := s.Transition("n1", CommunityConfirmed); err != nil { t.Fatalf("community confirm: %v", err) }
}

func TestNearby(t *testing.T) {
	s := NewStore()
	s.Create(Need{ID:"near", Latitude:6.5244, Longitude:3.3792})
	s.Create(Need{ID:"far", Latitude:9.0765, Longitude:7.3986})
	got := s.Nearby(6.5244,3.3792,20)
	if len(got) != 1 || got[0].ID != "near" { t.Fatalf("unexpected nearby results: %#v", got) }
}
