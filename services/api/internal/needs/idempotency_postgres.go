package needs

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5/pgconn"
	"time"
)

// Concurrent attempts may race the intent's unique key. Roll back the complete
// transaction and replay the winner from a fresh snapshot, never duplicate its
// need/outbox event. Expired retry receipts may be replaced within the transaction.
func (p *PostgresRepository) Create(ctx context.Context, n Need, key string) (Need, bool, error) {
 if err:=ValidateReportContext(n.Category,n.CategoryDetail,n.LocationContext);err!=nil{return Need{},false,err}
	if n.SDGTags == nil {
		n.SDGTags = []int{}
	}
	var last error
	for attempt := 0; attempt < 5; attempt++ {
		created, replayed, err := p.createOnce(ctx, n, key)
		var pgerr *pgconn.PgError
		if !errors.As(err, &pgerr) || (pgerr.Code != "40001" && pgerr.Code != "40P01" && !(pgerr.Code == "23505" && pgerr.ConstraintName == "idempotency_keys_pkey")) {
			return created, replayed, err
		}
		last = err
		timer := time.NewTimer(time.Duration(attempt+1) * 10 * time.Millisecond)
		select {
		case <-ctx.Done():
			timer.Stop()
			return Need{}, false, ctx.Err()
		case <-timer.C:
		}
	}
	return Need{}, false, last
}
