package projects

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

func (m *Manager) FindByNeed(ctx context.Context, needID string) (Project, error) {
	var p Project
	err := m.pool.QueryRow(ctx, `SELECT id,source_need_id,title,description,owner_community_id,project_manager_id,status,sdg_tags,created_by,created_at,updated_at FROM action_projects WHERE source_need_id=$1`, needID).Scan(&p.ID,&p.SourceNeedID,&p.Title,&p.Description,&p.OwnerCommunityID,&p.ProjectManagerID,&p.Status,&p.SDGTags,&p.CreatedBy,&p.CreatedAt,&p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) { return Project{}, ErrProjectNotFound }
	return p, err
}
