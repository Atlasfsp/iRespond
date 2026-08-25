package needs

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct{ pool *pgxpool.Pool }

func NewPostgresRepository(ctx context.Context, databaseURL string) (*PostgresRepository, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil { return nil, fmt.Errorf("create ysql pool: %w", err) }
	if err := pool.Ping(ctx); err != nil { pool.Close(); return nil, fmt.Errorf("ping yugabytedb ysql: %w", err) }
	return &PostgresRepository{pool: pool}, nil
}

func (p *PostgresRepository) Close() error { p.pool.Close(); return nil }

func (p *PostgresRepository) Create(ctx context.Context, n Need, idempotencyKey string) (Need, bool, error) {
	if n.VerificationState == "" { n.VerificationState = Observed }
	now := time.Now().UTC(); if n.CreatedAt.IsZero() { n.CreatedAt = now }; n.UpdatedAt = now
	tx, err := p.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil { return Need{}, false, err }
	defer tx.Rollback(ctx)
	if idempotencyKey != "" {
		var body []byte
		err = tx.QueryRow(ctx, `SELECT response_body FROM idempotency_keys WHERE scope='create_need' AND key=$1 AND expires_at > now()`, idempotencyKey).Scan(&body)
		if err == nil { var existing Need; if json.Unmarshal(body, &existing) == nil { return existing, true, nil } } else if !errors.Is(err, pgx.ErrNoRows) { return Need{}, false, err }
	}
	_, err = tx.Exec(ctx, `INSERT INTO needs(id,title,description,category,reporter_id,verification_state,sdg_tags,latitude,longitude,created_at,updated_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, n.ID,n.Title,n.Description,n.Category,n.ReporterID,n.VerificationState,n.SDGTags,n.Latitude,n.Longitude,n.CreatedAt,n.UpdatedAt)
	if err != nil { return Need{}, false, err }
	payload, _ := json.Marshal(n)
	_, err = tx.Exec(ctx, `INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1,'need',$2,'need.reported',$3)`, randomID(), n.ID, payload)
	if err != nil { return Need{}, false, err }
	if idempotencyKey != "" { h := sha256.Sum256(payload); _, err = tx.Exec(ctx, `INSERT INTO idempotency_keys(scope,key,request_hash,response_status,response_body,expires_at) VALUES('create_need',$1,$2,201,$3,now()+interval '24 hours')`, idempotencyKey, hex.EncodeToString(h[:]), payload); if err != nil { return Need{}, false, err } }
	if err := tx.Commit(ctx); err != nil { return Need{}, false, err }; return n, false, nil
}

func (p *PostgresRepository) Get(ctx context.Context, id string) (Need, error) {
	row := p.pool.QueryRow(ctx, `SELECT id,title,description,category,reporter_id,verification_state,sdg_tags,COALESCE(latitude,0),COALESCE(longitude,0),created_at,updated_at FROM needs WHERE id=$1`, id)
	return scanNeed(row)
}

func (p *PostgresRepository) Nearby(ctx context.Context, lat, lng, radiusKm float64) ([]Need, error) {
	latDelta:=radiusKm/111.32
	cosLat:=math.Cos(lat*math.Pi/180); if math.Abs(cosLat)<0.01 { cosLat=0.01 }
	lngDelta:=radiusKm/(111.32*math.Abs(cosLat))
	rows, err := p.pool.Query(ctx, `SELECT id,title,description,category,reporter_id,verification_state,sdg_tags,COALESCE(latitude,0),COALESCE(longitude,0),created_at,updated_at FROM needs WHERE latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4 ORDER BY updated_at DESC LIMIT 500`,lat-latDelta,lat+latDelta,lng-lngDelta,lng+lngDelta)
	if err != nil { return nil, err }; defer rows.Close()
	out:=make([]Need,0)
	for rows.Next(){n,err:=scanNeed(rows);if err!=nil{return nil,err};if haversineKm(lat,lng,n.Latitude,n.Longitude)<=radiusKm{out=append(out,n);if len(out)>=250{break}}}
	return out,rows.Err()
}

func (p *PostgresRepository) Transition(ctx context.Context, id string, next VerificationState, verifierID string) (Need, error) {
	tx, err := p.pool.BeginTx(ctx, pgx.TxOptions{}); if err != nil { return Need{}, err }; defer tx.Rollback(ctx)
	row := tx.QueryRow(ctx, `SELECT id,title,description,category,reporter_id,verification_state,sdg_tags,COALESCE(latitude,0),COALESCE(longitude,0),created_at,updated_at FROM needs WHERE id=$1 FOR UPDATE`, id)
	n, err := scanNeed(row); if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, ErrNotFound) { return Need{}, ErrNotFound }; if err != nil { return Need{}, err }; if !allowed(n.VerificationState,next) { return Need{}, ErrInvalidTransition }
	n.VerificationState=next; n.UpdatedAt=time.Now().UTC(); _, err = tx.Exec(ctx, `UPDATE needs SET verification_state=$2,updated_at=$3 WHERE id=$1`,id,next,n.UpdatedAt); if err != nil { return Need{}, err }
	_, err = tx.Exec(ctx, `INSERT INTO need_verifications(id,need_id,verifier_id,state) VALUES($1,$2,$3,$4)`,randomID(),id,verifierID,next); if err != nil { return Need{}, err }
	payload,_:=json.Marshal(n); _, err = tx.Exec(ctx, `INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1,'need',$2,'need.verification_changed',$3)`,randomID(),id,payload); if err != nil { return Need{}, err }
	if err:=tx.Commit(ctx); err!=nil{return Need{},err}; return n,nil
}

type rowScanner interface{ Scan(...any) error }
func scanNeed(row rowScanner) (Need,error) { var n Need; err:=row.Scan(&n.ID,&n.Title,&n.Description,&n.Category,&n.ReporterID,&n.VerificationState,&n.SDGTags,&n.Latitude,&n.Longitude,&n.CreatedAt,&n.UpdatedAt); if errors.Is(err,pgx.ErrNoRows){return Need{},ErrNotFound}; return n,err }
func randomID() string { var b [12]byte; _,_=rand.Read(b[:]); return hex.EncodeToString(b[:]) }
