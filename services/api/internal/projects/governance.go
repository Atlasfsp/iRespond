package projects

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

var (
	ErrInvalidProjectTransition = errors.New("invalid project transition")
	ErrInvalidMilestoneTransition = errors.New("invalid milestone transition")
	ErrMilestoneNotFound = errors.New("milestone not found")
	ErrRoleInviteNotFound = errors.New("role invite not found")
)

type RoleInvite struct {
	ID string `json:"id"`
	ProjectID string `json:"projectId"`
	InvitedActorID string `json:"invitedActorId"`
	Role string `json:"role"`
	InvitedBy string `json:"invitedBy"`
	Status string `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	RespondedAt *time.Time `json:"respondedAt,omitempty"`
}

func (m *Manager) HasAnyProjectRole(ctx context.Context, projectID, actorID string, roles ...string) (bool,error) {
	if len(roles)==0{return false,nil};var ok bool
	err:=m.pool.QueryRow(ctx,`SELECT EXISTS(SELECT 1 FROM project_roles WHERE project_id=$1 AND actor_id=$2 AND role=ANY($3))`,projectID,actorID,roles).Scan(&ok);return ok,err
}

func (m *Manager) InviteRole(ctx context.Context,id,projectID,actorID,role,invitedBy string)(RoleInvite,error){
	if !validProjectRole(role){return RoleInvite{},fmt.Errorf("invalid project role")};if _,err:=m.Get(ctx,projectID);err!=nil{return RoleInvite{},err};var v RoleInvite
	err:=m.pool.QueryRow(ctx,`INSERT INTO project_role_invites(id,project_id,invited_actor_id,role,invited_by) VALUES($1,$2,$3,$4,$5) RETURNING id,project_id,invited_actor_id,role,invited_by,status,created_at,responded_at`,id,projectID,actorID,role,invitedBy).Scan(&v.ID,&v.ProjectID,&v.InvitedActorID,&v.Role,&v.InvitedBy,&v.Status,&v.CreatedAt,&v.RespondedAt);return v,err
}

func (m *Manager) AcceptRole(ctx context.Context,inviteID,actorID string)(RoleInvite,error){
	tx,err:=m.pool.Begin(ctx);if err!=nil{return RoleInvite{},err};defer tx.Rollback(ctx);var v RoleInvite
	err=tx.QueryRow(ctx,`UPDATE project_role_invites SET status='accepted',responded_at=now() WHERE id=$1 AND invited_actor_id=$2 AND status='pending' RETURNING id,project_id,invited_actor_id,role,invited_by,status,created_at,responded_at`,inviteID,actorID).Scan(&v.ID,&v.ProjectID,&v.InvitedActorID,&v.Role,&v.InvitedBy,&v.Status,&v.CreatedAt,&v.RespondedAt)
	if errors.Is(err,pgx.ErrNoRows){return RoleInvite{},ErrRoleInviteNotFound};if err!=nil{return RoleInvite{},err};if _,err=tx.Exec(ctx,`INSERT INTO project_roles(project_id,actor_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,v.ProjectID,actorID,v.Role);err!=nil{return RoleInvite{},err}
	if v.Role=="project_manager"{if _,err=tx.Exec(ctx,`UPDATE action_projects SET project_manager_id=$2,updated_at=now() WHERE id=$1`,v.ProjectID,actorID);err!=nil{return RoleInvite{},err}};if err:=tx.Commit(ctx);err!=nil{return RoleInvite{},err};return v,nil
}

func (m *Manager) AddMilestone(ctx context.Context,id,projectID,title,description string,sequence int,targetAt *time.Time)(Milestone,error){
	if strings.TrimSpace(title)==""||sequence<=0{return Milestone{},fmt.Errorf("title and positive sequence are required")};var v Milestone
	err:=m.pool.QueryRow(ctx,`INSERT INTO project_milestones(id,project_id,title,description,sequence,target_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,project_id,title,description,status,sequence,target_at,completed_at`,id,projectID,strings.TrimSpace(title),strings.TrimSpace(description),sequence,targetAt).Scan(&v.ID,&v.ProjectID,&v.Title,&v.Description,&v.Status,&v.Sequence,&v.TargetAt,&v.CompletedAt)
	if err!=nil&&strings.Contains(strings.ToLower(err.Error()),"foreign key"){return Milestone{},ErrProjectNotFound};return v,err
}

func (m *Manager) TransitionMilestone(ctx context.Context,projectID,milestoneID,target,actorID string,canValidate bool)(Milestone,error){
	tx,err:=m.pool.Begin(ctx);if err!=nil{return Milestone{},err};defer tx.Rollback(ctx);var v Milestone
	err=tx.QueryRow(ctx,`SELECT id,project_id,title,description,status,sequence,target_at,completed_at FROM project_milestones WHERE id=$1 AND project_id=$2 FOR UPDATE`,milestoneID,projectID).Scan(&v.ID,&v.ProjectID,&v.Title,&v.Description,&v.Status,&v.Sequence,&v.TargetAt,&v.CompletedAt)
	if errors.Is(err,pgx.ErrNoRows){return Milestone{},ErrMilestoneNotFound};if err!=nil{return Milestone{},err};from:=v.Status
	if !allowedMilestoneTransition(from,target)||(target=="validated"&&!canValidate){return Milestone{},ErrInvalidMilestoneTransition};completed:=v.CompletedAt;if target=="validated"{now:=time.Now().UTC();completed=&now}
	err=tx.QueryRow(ctx,`UPDATE project_milestones SET status=$3,completed_at=$4 WHERE id=$1 AND project_id=$2 RETURNING id,project_id,title,description,status,sequence,target_at,completed_at`,milestoneID,projectID,target,completed).Scan(&v.ID,&v.ProjectID,&v.Title,&v.Description,&v.Status,&v.Sequence,&v.TargetAt,&v.CompletedAt);if err!=nil{return Milestone{},err}
	if _,err=tx.Exec(ctx,`INSERT INTO milestone_status_history(milestone_id,project_id,from_status,to_status,actor_id) VALUES($1,$2,$3,$4,$5)`,milestoneID,projectID,from,target,actorID);err!=nil{return Milestone{},err};if err:=tx.Commit(ctx);err!=nil{return Milestone{},err};return v,nil
}

func (m *Manager) TransitionProject(ctx context.Context,projectID,target,actorID string)(Project,error){
	tx,err:=m.pool.Begin(ctx);if err!=nil{return Project{},err};defer tx.Rollback(ctx);var p Project
	err=tx.QueryRow(ctx,`SELECT id,source_need_id,title,description,owner_community_id,project_manager_id,status,sdg_tags,created_by,created_at,updated_at FROM action_projects WHERE id=$1 FOR UPDATE`,projectID).Scan(&p.ID,&p.SourceNeedID,&p.Title,&p.Description,&p.OwnerCommunityID,&p.ProjectManagerID,&p.Status,&p.SDGTags,&p.CreatedBy,&p.CreatedAt,&p.UpdatedAt)
	if errors.Is(err,pgx.ErrNoRows){return Project{},ErrProjectNotFound};if err!=nil{return Project{},err};from:=p.Status;if !allowedProjectTransition(from,target){return Project{},ErrInvalidProjectTransition};if err:=projectReadiness(ctx,tx,projectID,target,p.ProjectManagerID);err!=nil{return Project{},err}
	err=tx.QueryRow(ctx,`UPDATE action_projects SET status=$2,updated_at=now() WHERE id=$1 RETURNING id,source_need_id,title,description,owner_community_id,project_manager_id,status,sdg_tags,created_by,created_at,updated_at`,projectID,target).Scan(&p.ID,&p.SourceNeedID,&p.Title,&p.Description,&p.OwnerCommunityID,&p.ProjectManagerID,&p.Status,&p.SDGTags,&p.CreatedBy,&p.CreatedAt,&p.UpdatedAt);if err!=nil{return Project{},err}
	if _,err=tx.Exec(ctx,`INSERT INTO project_status_history(project_id,from_status,to_status,actor_id) VALUES($1,$2,$3,$4)`,projectID,from,target,actorID);err!=nil{return Project{},err}
	if _,err=tx.Exec(ctx,`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1::text,'action_project',$2::text,'project.status_changed',jsonb_build_object('projectId',$2::text,'from',$3::text,'to',$4::text,'actorId',$5::text))`,projectID+"-"+target+"-"+fmt.Sprint(time.Now().UnixNano()),projectID,from,target,actorID);err!=nil{return Project{},err};if err:=tx.Commit(ctx);err!=nil{return Project{},err};return p,nil
}

func projectReadiness(ctx context.Context,tx pgx.Tx,projectID,target string,managerID *string)error{var count int;switch target{case"approved":if managerID==nil||*managerID==""{return fmt.Errorf("project manager must accept role before approval")};if err:=tx.QueryRow(ctx,`SELECT count(*) FROM project_milestones WHERE project_id=$1 AND status<>'cancelled'`,projectID).Scan(&count);err!=nil{return err};if count==0{return fmt.Errorf("at least one milestone is required before approval")};case"validating":if err:=tx.QueryRow(ctx,`SELECT count(*) FROM project_milestones WHERE project_id=$1 AND status NOT IN ('submitted','validated','cancelled')`,projectID).Scan(&count);err!=nil{return err};if count>0{return fmt.Errorf("all active milestones must be submitted before validation")};case"maintaining":if err:=tx.QueryRow(ctx,`SELECT count(*) FROM project_milestones WHERE project_id=$1 AND status NOT IN ('validated','cancelled')`,projectID).Scan(&count);err!=nil{return err};if count>0{return fmt.Errorf("all active milestones must be validated before maintenance")};case"completed":if err:=tx.QueryRow(ctx,`SELECT count(*) FROM project_roles WHERE project_id=$1 AND role='maintenance_owner'`,projectID).Scan(&count);err!=nil{return err};if count==0{return fmt.Errorf("maintenance owner is required before completion")}};return nil}
func allowedProjectTransition(from,to string)bool{if to=="cancelled"&&from!="completed"&&from!="cancelled"{return true};return map[string]string{"draft":"approved","approved":"mobilising","mobilising":"executing","executing":"validating","validating":"maintaining","maintaining":"completed"}[from]==to}
func allowedMilestoneTransition(from,to string)bool{if to=="cancelled"&&from!="validated"&&from!="cancelled"{return true};switch from{case"planned":return to=="ready";case"ready":return to=="in_progress";case"in_progress":return to=="blocked"||to=="submitted";case"blocked":return to=="in_progress";case"submitted":return to=="validated"};return false}
func validProjectRole(role string)bool{switch role{case"project_manager","community_steward","verifier","volunteer_lead","procurement_lead","maintenance_owner":return true};return false}
