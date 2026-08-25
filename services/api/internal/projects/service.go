package projects

import (
  "context"
  "crypto/rand"
  "encoding/hex"
  "errors"
  "strings"
  "time"

  "github.com/jackc/pgx/v5"
  "github.com/jackc/pgx/v5/pgxpool"
)

var (
  ErrNeedNotFound = errors.New("need not found")
  ErrNeedNotConfirmed = errors.New("need is not confirmed")
  ErrProjectExists = errors.New("project already exists for need")
  ErrProjectNotFound = errors.New("project not found")
)

type Service struct{ db *pgxpool.Pool }

type Project struct {
  ID string `json:"id"`
  SourceNeedID string `json:"sourceNeedId"`
  CreatedBy string `json:"createdBy"`
  Title string `json:"title"`
  Summary string `json:"summary"`
  Status string `json:"status"`
  Currency string `json:"currency,omitempty"`
  EstimatedBudgetMinor *int64 `json:"estimatedBudgetMinor,omitempty"`
  TargetDays *int `json:"targetDays,omitempty"`
  SDGTags []int `json:"sdgTags"`
  CreatedAt time.Time `json:"createdAt"`
  UpdatedAt time.Time `json:"updatedAt"`
}

type CreateInput struct {
  NeedID string
  CreatedBy string
  Title string
  Summary string
  Currency string
  EstimatedBudgetMinor *int64
  TargetDays *int
}

func New(ctx context.Context,databaseURL string)(*Service,error){pool,err:=pgxpool.New(ctx,databaseURL);if err!=nil{return nil,err};if err:=pool.Ping(ctx);err!=nil{pool.Close();return nil,err};return &Service{db:pool},nil}
func (s *Service) Close(){if s!=nil&&s.db!=nil{s.db.Close()}}

func (s *Service) CreateFromNeed(ctx context.Context,in CreateInput)(Project,error){
  tx,err:=s.db.Begin(ctx);if err!=nil{return Project{},err};defer func(){_ = tx.Rollback(ctx)}()
  var state string;var sdgs []int;var needTitle string
  err=tx.QueryRow(ctx,`SELECT verification_state,sdg_tags,title FROM needs WHERE id=$1 FOR SHARE`,in.NeedID).Scan(&state,&sdgs,&needTitle)
  if errors.Is(err,pgx.ErrNoRows){return Project{},ErrNeedNotFound};if err!=nil{return Project{},err}
  if !confirmed(state){return Project{},ErrNeedNotConfirmed}
  title:=strings.TrimSpace(in.Title);if title==""{title=needTitle};summary:=strings.TrimSpace(in.Summary);if summary==""{summary="Action project created from verified community need."}
  id:=newID();var p Project
  err=tx.QueryRow(ctx,`INSERT INTO action_projects(id,source_need_id,created_by,title,summary,currency,estimated_budget_minor,target_days,sdg_tags) VALUES($1,$2,$3,$4,$5,NULLIF($6,''),$7,$8,$9) RETURNING id,source_need_id,created_by,title,summary,status,COALESCE(currency,''),estimated_budget_minor,target_days,sdg_tags,created_at,updated_at`,id,in.NeedID,in.CreatedBy,title,summary,strings.ToUpper(strings.TrimSpace(in.Currency)),in.EstimatedBudgetMinor,in.TargetDays,sdgs).Scan(&p.ID,&p.SourceNeedID,&p.CreatedBy,&p.Title,&p.Summary,&p.Status,&p.Currency,&p.EstimatedBudgetMinor,&p.TargetDays,&p.SDGTags,&p.CreatedAt,&p.UpdatedAt)
  if err!=nil{if strings.Contains(strings.ToLower(err.Error()),"source_need_id"){return Project{},ErrProjectExists};return Project{},err}
  _,err=tx.Exec(ctx,`INSERT INTO project_roles(project_id,principal_id,role) VALUES($1,$2,'project_manager') ON CONFLICT DO NOTHING`,id,in.CreatedBy);if err!=nil{return Project{},err}
  _,err=tx.Exec(ctx,`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1,'action_project',$2,'project.created',jsonb_build_object('projectId',$2,'sourceNeedId',$3,'createdBy',$4))`,newID(),id,in.NeedID,in.CreatedBy);if err!=nil{return Project{},err}
  if err:=tx.Commit(ctx);err!=nil{return Project{},err};return p,nil
}

func (s *Service) Get(ctx context.Context,id string)(Project,error){var p Project;err:=s.db.QueryRow(ctx,`SELECT id,source_need_id,created_by,title,summary,status,COALESCE(currency,''),estimated_budget_minor,target_days,sdg_tags,created_at,updated_at FROM action_projects WHERE id=$1`,id).Scan(&p.ID,&p.SourceNeedID,&p.CreatedBy,&p.Title,&p.Summary,&p.Status,&p.Currency,&p.EstimatedBudgetMinor,&p.TargetDays,&p.SDGTags,&p.CreatedAt,&p.UpdatedAt);if errors.Is(err,pgx.ErrNoRows){return Project{},ErrProjectNotFound};return p,err}

func confirmed(state string)bool{switch state{case"community_confirmed","institution_confirmed","expert_confirmed","independently_audited","government_confirmed":return true;default:return false}}
func newID()string{var b[16]byte;_,_=rand.Read(b[:]);return hex.EncodeToString(b[:])}
