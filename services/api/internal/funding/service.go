package funding

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

var ErrProjectNotFound=errors.New("project not found")
var ErrPlanNotFound=errors.New("funding plan not found")
var ErrPlanNotOpen=errors.New("funding plan is not open")
var ErrInvalidFundingPlan=errors.New("invalid funding plan")
var ErrPledgeNotFound=errors.New("pledge not found")

type Service struct{pool *pgxpool.Pool}
type Plan struct{ProjectID string `json:"projectId"`;Currency string `json:"currency"`;TargetMinor int64 `json:"targetMinor"`;CommunityCounterpartMinor int64 `json:"communityCounterpartMinor"`;ExternalTargetMinor int64 `json:"externalTargetMinor"`;Status string `json:"status"`;PledgedMinor int64 `json:"pledgedMinor"`;ConfirmedMinor int64 `json:"confirmedMinor"`;UpdatedAt time.Time `json:"updatedAt"`}
type Pledge struct{ID string `json:"id"`;ProjectID string `json:"projectId"`;ContributorID string `json:"contributorId"`;ContributionClass string `json:"contributionClass"`;AmountMinor int64 `json:"amountMinor"`;Currency string `json:"currency"`;Status string `json:"status"`;ExternalInstructionID string `json:"externalInstructionId,omitempty"`;CreatedAt time.Time `json:"createdAt"`;UpdatedAt time.Time `json:"updatedAt"`}

func New(ctx context.Context,url string)(*Service,error){p,e:=pgxpool.New(ctx,url);if e!=nil{return nil,e};if e=p.Ping(ctx);e!=nil{p.Close();return nil,fmt.Errorf("funding yugabytedb ping: %w",e)};return &Service{pool:p},nil}
func(s *Service)Close(){if s!=nil&&s.pool!=nil{s.pool.Close()}}

func(s *Service)UpsertPlan(ctx context.Context,projectID,currency string,target,counterpart int64,actor string)(Plan,error){
	currency=strings.ToUpper(strings.TrimSpace(currency));if len(currency)!=3||target<=0||counterpart<0||counterpart>target{return Plan{},ErrInvalidFundingPlan}
	tx,e:=s.pool.BeginTx(ctx,pgx.TxOptions{});if e!=nil{return Plan{},e};defer tx.Rollback(ctx)
	var exists bool;if e=tx.QueryRow(ctx,`SELECT EXISTS(SELECT 1 FROM action_projects WHERE id=$1)`,projectID).Scan(&exists);e!=nil{return Plan{},e};if !exists{return Plan{},ErrProjectNotFound}
	now:=time.Now().UTC();external:=target-counterpart
	_,e=tx.Exec(ctx,`INSERT INTO project_funding_plans(project_id,currency,target_minor,community_counterpart_minor,external_target_minor,status,created_by,created_at,updated_at)
	VALUES($1,$2,$3,$4,$5,'open',$6,$7,$7)
	ON CONFLICT(project_id) DO UPDATE SET currency=excluded.currency,target_minor=excluded.target_minor,community_counterpart_minor=excluded.community_counterpart_minor,external_target_minor=excluded.external_target_minor,status=CASE WHEN project_funding_plans.status='draft' THEN 'open' ELSE project_funding_plans.status END,updated_at=excluded.updated_at`,projectID,currency,target,counterpart,external,actor,now);if e!=nil{return Plan{},e}
	payload,_:=json.Marshal(map[string]any{"projectId":projectID,"currency":currency,"targetMinor":target,"communityCounterpartMinor":counterpart,"externalTargetMinor":external,"actorId":actor})
	if _,e=tx.Exec(ctx,`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1,'project_funding',$2,'funding.plan_changed',$3)`,newID(),projectID,payload);e!=nil{return Plan{},e};if e=tx.Commit(ctx);e!=nil{return Plan{},e};return s.Plan(ctx,projectID)
}

func(s *Service)Plan(ctx context.Context,projectID string)(Plan,error){
	var p Plan;e:=s.pool.QueryRow(ctx,`SELECT f.project_id,f.currency,f.target_minor,f.community_counterpart_minor,f.external_target_minor,f.status,f.updated_at,
	COALESCE(sum(CASE WHEN p.status IN ('pledged','movement_pending','confirmed') THEN p.amount_minor ELSE 0 END),0),COALESCE(sum(CASE WHEN p.status='confirmed' THEN p.amount_minor ELSE 0 END),0)
	FROM project_funding_plans f LEFT JOIN funding_pledges p ON p.project_id=f.project_id WHERE f.project_id=$1 GROUP BY f.project_id,f.currency,f.target_minor,f.community_counterpart_minor,f.external_target_minor,f.status,f.updated_at`,projectID).Scan(&p.ProjectID,&p.Currency,&p.TargetMinor,&p.CommunityCounterpartMinor,&p.ExternalTargetMinor,&p.Status,&p.UpdatedAt,&p.PledgedMinor,&p.ConfirmedMinor);if errors.Is(e,pgx.ErrNoRows){return Plan{},ErrPlanNotFound};return p,e
}

func(s *Service)CreatePledge(ctx context.Context,projectID,contributor,class string,amount int64)(Pledge,error){
	class=strings.TrimSpace(class);if amount<=0||!(class=="community_counterpart"||class=="external_donation"||class=="matching_commitment"){return Pledge{},ErrInvalidFundingPlan}
	tx,e:=s.pool.BeginTx(ctx,pgx.TxOptions{});if e!=nil{return Pledge{},e};defer tx.Rollback(ctx)
	var currency,status string;e=tx.QueryRow(ctx,`SELECT currency,status FROM project_funding_plans WHERE project_id=$1 FOR UPDATE`,projectID).Scan(&currency,&status);if errors.Is(e,pgx.ErrNoRows){return Pledge{},ErrPlanNotFound};if e!=nil{return Pledge{},e};if status!="open"{return Pledge{},ErrPlanNotOpen}
	now:=time.Now().UTC();p:=Pledge{ID:newID(),ProjectID:projectID,ContributorID:contributor,ContributionClass:class,AmountMinor:amount,Currency:currency,Status:"pledged",CreatedAt:now,UpdatedAt:now}
	_,e=tx.Exec(ctx,`INSERT INTO funding_pledges(id,project_id,contributor_id,contribution_class,amount_minor,currency,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,'pledged',$7,$7)`,p.ID,projectID,contributor,class,amount,currency,now);if e!=nil{return Pledge{},e}
	payload,_:=json.Marshal(p);if _,e=tx.Exec(ctx,`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1,'funding_pledge',$2,'funding.pledged',$3)`,newID(),p.ID,payload);e!=nil{return Pledge{},e};if e=tx.Commit(ctx);e!=nil{return Pledge{},e};return p,nil
}

func(s *Service)ListProjectPledges(ctx context.Context,projectID string)([]Pledge,error){rows,e:=s.pool.Query(ctx,`SELECT id,project_id,contributor_id,contribution_class,amount_minor,currency,status,COALESCE(external_instruction_id,''),created_at,updated_at FROM funding_pledges WHERE project_id=$1 ORDER BY created_at DESC`,projectID);if e!=nil{return nil,e};defer rows.Close();out:=[]Pledge{};for rows.Next(){var p Pledge;if e=rows.Scan(&p.ID,&p.ProjectID,&p.ContributorID,&p.ContributionClass,&p.AmountMinor,&p.Currency,&p.Status,&p.ExternalInstructionID,&p.CreatedAt,&p.UpdatedAt);e!=nil{return nil,e};out=append(out,p)};return out,rows.Err()}
func(s *Service)ListMyPledges(ctx context.Context,userID string)([]Pledge,error){rows,e:=s.pool.Query(ctx,`SELECT id,project_id,contributor_id,contribution_class,amount_minor,currency,status,COALESCE(external_instruction_id,''),created_at,updated_at FROM funding_pledges WHERE contributor_id=$1 ORDER BY created_at DESC`,userID);if e!=nil{return nil,e};defer rows.Close();out:=[]Pledge{};for rows.Next(){var p Pledge;if e=rows.Scan(&p.ID,&p.ProjectID,&p.ContributorID,&p.ContributionClass,&p.AmountMinor,&p.Currency,&p.Status,&p.ExternalInstructionID,&p.CreatedAt,&p.UpdatedAt);e!=nil{return nil,e};out=append(out,p)};return out,rows.Err()}
func(s *Service)CancelPledge(ctx context.Context,id,userID string)(Pledge,error){tx,e:=s.pool.BeginTx(ctx,pgx.TxOptions{});if e!=nil{return Pledge{},e};defer tx.Rollback(ctx);var p Pledge;e=tx.QueryRow(ctx,`UPDATE funding_pledges SET status='cancelled',updated_at=now() WHERE id=$1 AND contributor_id=$2 AND status='pledged' RETURNING id,project_id,contributor_id,contribution_class,amount_minor,currency,status,COALESCE(external_instruction_id,''),created_at,updated_at`,id,userID).Scan(&p.ID,&p.ProjectID,&p.ContributorID,&p.ContributionClass,&p.AmountMinor,&p.Currency,&p.Status,&p.ExternalInstructionID,&p.CreatedAt,&p.UpdatedAt);if errors.Is(e,pgx.ErrNoRows){return Pledge{},ErrPledgeNotFound};if e!=nil{return Pledge{},e};payload,_:=json.Marshal(p);if _,e=tx.Exec(ctx,`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1,'funding_pledge',$2,'funding.pledge_cancelled',$3)`,newID(),p.ID,payload);e!=nil{return Pledge{},e};if e=tx.Commit(ctx);e!=nil{return Pledge{},e};return p,nil}
func newID()string{var b[12]byte;_,_=rand.Read(b[:]);return hex.EncodeToString(b[:])}
