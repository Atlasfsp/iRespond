CREATE TABLE IF NOT EXISTS action_projects (
  id text PRIMARY KEY,
  source_need_id text NOT NULL UNIQUE REFERENCES needs(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  owner_community_id text NOT NULL DEFAULT '',
  project_manager_id text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','mobilising','executing','validating','maintaining','completed','cancelled')),
  sdg_tags integer[] NOT NULL DEFAULT '{}',
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS action_projects_status_idx ON action_projects(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS project_milestones (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES action_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','ready','in_progress','blocked','submitted','validated','cancelled')),
  sequence integer NOT NULL CHECK (sequence > 0),
  target_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, sequence)
);

CREATE TABLE IF NOT EXISTS project_roles (
  project_id text NOT NULL REFERENCES action_projects(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('project_manager','community_steward','verifier','volunteer_lead','procurement_lead','maintenance_owner')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(project_id, actor_id, role)
);

CREATE TABLE IF NOT EXISTS contribution_needs (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES action_projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('money','time','skill','materials','equipment','transport','knowledge','access','influence','care','approval','space','leadership')),
  description text NOT NULL,
  quantity_note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','partially_filled','filled','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contribution_needs_project_idx ON contribution_needs(project_id, status);
