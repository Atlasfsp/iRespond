package projects

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNeedNotFound     = errors.New("need not found")
	ErrNeedNotVerified  = errors.New("need is not sufficiently verified")
	ErrAlreadyConverted = errors.New("need already converted to a project")
	ErrProjectNotFound  = errors.New("project not found")
)

type Project struct {
	ID               string    `json:"id"`
	SourceNeedID     string    `json:"sourceNeedId"`
	Title            string    `json:"title"`
	Description      string    `json:"description"`
	OwnerCommunityID string    `json:"ownerCommunityId"`
	ProjectManagerID *string   `json:"projectManagerId,omitempty"`
	Status           string    `json:"status"`
	SDGTags          []int     `json:"sdgTags"`
	CreatedBy        string    `json:"createdBy"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type Milestone struct {
	ID          string     `json:"id"`
	ProjectID   string     `json:"projectId"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      string     `json:"status"`
	Sequence    int        `json:"sequence"`
	TargetAt    *time.Time `json:"targetAt,omitempty"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
}

type ContributionNeed struct {
	ID           string `json:"id"`
	ProjectID    string `json:"projectId"`
	Kind         string `json:"kind"`
	Description  string `json:"description"`
	QuantityNote string `json:"quantityNote"`
	Status       string `json:"status"`
}

type Detail struct {
	Project           Project            `json:"project"`
	Milestones        []Milestone        `json:"milestones"`
	ContributionNeeds []ContributionNeed `json:"contributionNeeds"`
}

type Manager struct{ pool *pgxpool.Pool }

func New(ctx context.Context, databaseURL string) (*Manager, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil { return nil, err }
	if err := pool.Ping(ctx); err != nil { pool.Close(); return nil, err }
	return &Manager{pool: pool}, nil
}
func (m *Manager) Close() { if m != nil && m.pool != nil { m.pool.Close() } }

func (m *Manager) Convert(ctx context.Context, id, needID, title, description, communityID, actorID string) (Project, error) {
	tx, err := m.pool.Begin(ctx); if err != nil { return Project{}, err }; defer tx.Rollback(ctx)
	var needTitle, needDescription, state string; var sdgTags []int
	err = tx.QueryRow(ctx, `SELECT title,description,verification_state,sdg_tags FROM needs WHERE id=$1 FOR UPDATE`, needID).Scan(&needTitle,&needDescription,&state,&sdgTags)
	if errors.Is(err, pgx.ErrNoRows) { return Project{}, ErrNeedNotFound }; if err != nil { return Project{}, err }
	if !isVerified(state) { return Project{}, ErrNeedNotVerified }
	var existing string
	err = tx.QueryRow(ctx, `SELECT id FROM action_projects WHERE source_need_id=$1`, needID).Scan(&existing)
	if err == nil { return Project{}, fmt.Errorf("%w: %s", ErrAlreadyConverted, existing) }; if !errors.Is(err, pgx.ErrNoRows) { return Project{}, err }
	if title == "" { title = needTitle }; if description == "" { description = needDescription }
	var p Project
	err = tx.QueryRow(ctx, `INSERT INTO action_projects(id,source_need_id,title,description,owner_community_id,status,sdg_tags,created_by) VALUES($1,$2,$3,$4,$5,'draft',$6,$7) RETURNING id,source_need_id,title,description,owner_community_id,project_manager_id,status,sdg_tags,created_by,created_at,updated_at`, id,needID,title,description,communityID,sdgTags,actorID).Scan(&p.ID,&p.SourceNeedID,&p.Title,&p.Description,&p.OwnerCommunityID,&p.ProjectManagerID,&p.Status,&p.SDGTags,&p.CreatedBy,&p.CreatedAt,&p.UpdatedAt)
	if err != nil { return Project{}, err }
	if _, err = tx.Exec(ctx, `INSERT INTO project_roles(project_id,actor_id,role) VALUES($1,$2,'community_steward')`, id, actorID); err != nil { return Project{}, err }
	_, err = tx.Exec(ctx, `INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1::text,'action_project',$2::text,'project.created',jsonb_build_object('projectId',$2::text,'sourceNeedId',$3::text,'createdBy',$4::text))`, id+"-created", id, needID, actorID)
	if err != nil { return Project{}, err }
	if err := tx.Commit(ctx); err != nil { return Project{}, err }
	return p, nil
}

func (m *Manager) Get(ctx context.Context, id string) (Detail, error) {
	var p Project
	err := m.pool.QueryRow(ctx, `SELECT id,source_need_id,title,description,owner_community_id,project_manager_id,status,sdg_tags,created_by,created_at,updated_at FROM action_projects WHERE id=$1`, id).Scan(&p.ID,&p.SourceNeedID,&p.Title,&p.Description,&p.OwnerCommunityID,&p.ProjectManagerID,&p.Status,&p.SDGTags,&p.CreatedBy,&p.CreatedAt,&p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) { return Detail{}, ErrProjectNotFound }; if err != nil { return Detail{}, err }
	milestones := []Milestone{}; rows, err := m.pool.Query(ctx, `SELECT id,project_id,title,description,status,sequence,target_at,completed_at FROM project_milestones WHERE project_id=$1 ORDER BY sequence`, id); if err != nil { return Detail{}, err }
	for rows.Next(){ var v Milestone; if err:=rows.Scan(&v.ID,&v.ProjectID,&v.Title,&v.Description,&v.Status,&v.Sequence,&v.TargetAt,&v.CompletedAt);err!=nil{rows.Close();return Detail{},err}; milestones=append(milestones,v) }; rows.Close()
	needs := []ContributionNeed{}; rows, err = m.pool.Query(ctx, `SELECT id,project_id,kind,description,quantity_note,status FROM contribution_needs WHERE project_id=$1 ORDER BY created_at`, id); if err != nil { return Detail{}, err }
	for rows.Next(){ var v ContributionNeed; if err:=rows.Scan(&v.ID,&v.ProjectID,&v.Kind,&v.Description,&v.QuantityNote,&v.Status);err!=nil{rows.Close();return Detail{},err}; needs=append(needs,v) }; rows.Close()
	return Detail{Project:p,Milestones:milestones,ContributionNeeds:needs},nil
}

func isVerified(state string) bool { switch state { case "community_confirmed","institution_confirmed","expert_confirmed","independently_audited","government_confirmed": return true }; return false }
