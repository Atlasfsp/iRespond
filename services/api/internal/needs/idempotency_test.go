package needs

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"
)

func TestMemoryCreationIntentIsRetrySafe(t *testing.T) {
	repo := NewMemoryRepository()
	defer repo.Close()
	ctx := context.Background()
	var wg sync.WaitGroup
	var mu sync.Mutex
	ids := map[string]bool{}
	createdCount := 0
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			n, replayed, err := repo.Create(ctx, Need{ID: fmt.Sprintf("attempt-%d", i), Title: "Synthetic need", Description: "Test only", Latitude: 6.5, Longitude: 3.4}, "same-intent")
			if err != nil {
				t.Error(err)
				return
			}
			mu.Lock()
			ids[n.ID] = true
			if !replayed {
				createdCount++
			}
			mu.Unlock()
		}(i)
	}
	wg.Wait()
	if len(ids) != 1 || createdCount != 1 {
		t.Fatalf("retry created %d distinct IDs, %d original responses", len(ids), createdCount)
	}
	_, _, err := repo.Create(ctx, Need{ID: "changed", Title: "Changed payload", Description: "Test only", Latitude: 6.5, Longitude: 3.4}, "same-intent")
	if !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("expected intent conflict, got %v", err)
	}
}

func TestMemoryExpiredIntentCanBeRenewed(t *testing.T) {
	repo := NewMemoryRepository()
	defer repo.Close()
	ctx := context.Background()
	if _, _, err := repo.Create(ctx, Need{ID: "first", Title: "First"}, "expired-key"); err != nil {
		t.Fatal(err)
	}
	receipt := repo.intents["expired-key"]
	receipt.expiresAt = time.Now().Add(-time.Second)
	repo.intents["expired-key"] = receipt
	n, replay, err := repo.Create(ctx, Need{ID: "second", Title: "Second"}, "expired-key")
	if err != nil || replay || n.ID != "second" {
		t.Fatalf("expired intent: %v %v %v", n, replay, err)
	}
}
