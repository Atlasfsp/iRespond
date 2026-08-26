package funding

import "context"

func (s *Service) CanManage(ctx context.Context, projectID, actorID string) (bool, error) {
	var allowed bool
	err := s.pool.QueryRow(ctx, `SELECT EXISTS(
		SELECT 1 FROM project_roles
		WHERE project_id=$1 AND actor_id=$2
		  AND role IN ('project_manager','community_steward')
	)`, projectID, actorID).Scan(&allowed)
	return allowed, err
}
