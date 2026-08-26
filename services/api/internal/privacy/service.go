package privacy

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct{ pool *pgxpool.Pool }

type Consent struct {
	Purpose string `json:"purpose"`
	Granted bool `json:"granted"`
	PolicyVersion string `json:"policyVersion"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Request struct {
	ID string `json:"id"`
	Type string `json:"type"`
	Status string `json:"status"`
	RequestedAt time.Time `json:"requestedAt"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
}

var ErrInvalidPurpose = errors.New("invalid privacy purpose")
var ErrInvalidRequestType = errors.New("invalid privacy request type")

var allowedRequestTypes = map[string]bool{"access":true,"export":true,"correction":true,"deletion":true}

func New(ctx context.Context, databaseURL string) (*Service,error) {
	pool,err:=pgxpool.New(ctx,databaseURL); if err!=nil{return nil,fmt.Errorf("privacy pool: %w",err)}
	if err:=pool.Ping(ctx);err!=nil{pool.Close();return nil,fmt.Errorf("privacy yugabytedb ping: %w",err)}
	return &Service{pool:pool},nil
}
func (s *Service) Close(){if s!=nil&&s.pool!=nil{s.pool.Close()}}

func (s *Service) SetConsent(ctx context.Context,userID,purpose string,granted bool,policyVersion string)(Consent,error){
	purpose=strings.TrimSpace(strings.ToLower(purpose)); policyVersion=strings.TrimSpace(policyVersion)
	if purpose==""||len(purpose)>80||policyVersion==""||len(policyVersion)>80{return Consent{},ErrInvalidPurpose}
	now:=time.Now().UTC()
	_,err:=s.pool.Exec(ctx,`INSERT INTO privacy_consents(user_id,purpose,granted,policy_version,updated_at) VALUES($1,$2,$3,$4,$5)
	ON CONFLICT(user_id,purpose) DO UPDATE SET granted=excluded.granted,policy_version=excluded.policy_version,updated_at=excluded.updated_at`,userID,purpose,granted,policyVersion,now)
	if err!=nil{return Consent{},err}
	payload,_:=json.Marshal(map[string]any{"userId":userID,"purpose":purpose,"granted":granted,"policyVersion":policyVersion,"updatedAt":now})
	_,err=s.pool.Exec(ctx,`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1,'privacy_consent',$2,'privacy.consent_changed',$3)`,newID(),userID,payload)
	if err!=nil{return Consent{},err}
	return Consent{Purpose:purpose,Granted:granted,PolicyVersion:policyVersion,UpdatedAt:now},nil
}

func (s *Service) Consents(ctx context.Context,userID string)([]Consent,error){
	rows,err:=s.pool.Query(ctx,`SELECT purpose,granted,policy_version,updated_at FROM privacy_consents WHERE user_id=$1 ORDER BY purpose`,userID);if err!=nil{return nil,err};defer rows.Close()
	out:=[]Consent{};for rows.Next(){var c Consent;if err:=rows.Scan(&c.Purpose,&c.Granted,&c.PolicyVersion,&c.UpdatedAt);err!=nil{return nil,err};out=append(out,c)};return out,rows.Err()
}

func (s *Service) Request(ctx context.Context,userID,requestType string)(Request,error){
	requestType=strings.TrimSpace(strings.ToLower(requestType));if !allowedRequestTypes[requestType]{return Request{},ErrInvalidRequestType}
	tx,err:=s.pool.BeginTx(ctx,pgx.TxOptions{});if err!=nil{return Request{},err};defer tx.Rollback(ctx)
	r:=Request{ID:newID(),Type:requestType,Status:"requested",RequestedAt:time.Now().UTC()}
	_,err=tx.Exec(ctx,`INSERT INTO privacy_requests(id,user_id,request_type,status,requested_at) VALUES($1,$2,$3,$4,$5)`,r.ID,userID,r.Type,r.Status,r.RequestedAt);if err!=nil{return Request{},err}
	payload,_:=json.Marshal(map[string]any{"requestId":r.ID,"userId":userID,"type":r.Type,"status":r.Status,"requestedAt":r.RequestedAt})
	_,err=tx.Exec(ctx,`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1,'privacy_request',$2,'privacy.requested',$3)`,newID(),r.ID,payload);if err!=nil{return Request{},err}
	if err:=tx.Commit(ctx);err!=nil{return Request{},err};return r,nil
}

func (s *Service) Requests(ctx context.Context,userID string)([]Request,error){
	rows,err:=s.pool.Query(ctx,`SELECT id,request_type,status,requested_at,completed_at FROM privacy_requests WHERE user_id=$1 ORDER BY requested_at DESC`,userID);if err!=nil{return nil,err};defer rows.Close()
	out:=[]Request{};for rows.Next(){var r Request;if err:=rows.Scan(&r.ID,&r.Type,&r.Status,&r.RequestedAt,&r.CompletedAt);err!=nil{return nil,err};out=append(out,r)};return out,rows.Err()
}

func newID()string{var b[12]byte;_,_=rand.Read(b[:]);return hex.EncodeToString(b[:])}
