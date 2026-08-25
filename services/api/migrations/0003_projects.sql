CREATE TABLE IF NOT EXISTS action_projects (
  id text PRIMARY KEY,
  source_need_id text NOT NULL UNIQUE REFERENCES needs(id) ON DELETE RESTRICT,
  created_by text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','mobilising','executing','validating','maintaining','completed','cancelled')),
  currency text,
  estimated_budget_minor bigint CHECK (estimated_budget_minor IS NULL OR estimated_budget_minor >= 0),
  target_days integer CHECK (target_days IS NULL OR (target_days > 0 AND target_days <= 3650)),
  sdg_tags integer[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS action_projects_status_idx ON action_projects(status, created_at DESC);
CREATE INDEX IF NOT EXISTS action_projects_creator_idx ON action_projects(created_by, created_at DESC);

CREATE TABLE IF NOT EXISTS project_milestones (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES action_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  sequence integer NOT NULL CHECK (sequence > 0),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','ready','in_progress','blocked','completed','cancelled')),
  target_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, sequence)
);

CREATE TABLE IF NOT EXISTS project_roles (
  project_id text NOT NULL REFERENCES action_projects(id) ON DELETE CASCADE,
  principal_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('community_sponsor','project_manager','technical_reviewer','government_liaison','finance_steward','volunteer_coordinator','impact_assessor','maintenance_steward')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(project_id, principal_id, role)
);
