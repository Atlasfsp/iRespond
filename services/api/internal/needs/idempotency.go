package needs

import (
	"errors"
	"slices"
)

var ErrIdempotencyConflict = errors.New("idempotency key is bound to another observation intent")

// Ignore generated IDs, timestamps and server-owned verification state, but bind
// all reporter-controlled creation fields. Nil and empty SDG lists are equivalent.
func sameCreationIntent(a, b Need) bool {
	return a.Title == b.Title && a.Description == b.Description && a.Category == b.Category && a.Latitude == b.Latitude && a.Longitude == b.Longitude && a.ReporterID == b.ReporterID && slices.Equal(a.SDGTags, b.SDGTags)
}
