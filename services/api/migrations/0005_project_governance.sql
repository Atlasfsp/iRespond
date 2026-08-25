CREATE TABLE IF NOT EXISTS project_role_invites (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES action_projects(id) ON DELETE CASCADE,
  invited_actor_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('project_manager','community_steward','verifier','volunteer_lead','procurement_lead','maintenance_owner')),
  invited_by text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(project_id, invited_actor_id, role, status)
);

CREATE TABLE IF NOT EXISTS project_status_history (
  id bigserial PRIMARY KEY,
  project_id text NOT NULL REFERENCES action_projects(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  actor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestone_status_history (
  id bigserial PRIMARY KEY,
  milestone_id text NOT NULL REFERENCES project_milestones(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES action_projects(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  actor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
