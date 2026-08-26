CREATE TABLE IF NOT EXISTS project_funding_plans (
  project_id text PRIMARY KEY REFERENCES action_projects(id) ON DELETE CASCADE,
  currency text NOT NULL,
  target_minor bigint NOT NULL CHECK (target_minor >= 0),
  community_counterpart_minor bigint NOT NULL DEFAULT 0 CHECK (community_counterpart_minor >= 0),
  external_target_minor bigint NOT NULL DEFAULT 0 CHECK (external_target_minor >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','funded','closed','cancelled')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (community_counterpart_minor + external_target_minor = target_minor)
);

CREATE TABLE IF NOT EXISTS funding_pledges (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES action_projects(id) ON DELETE CASCADE,
  contributor_id text NOT NULL,
  contribution_class text NOT NULL CHECK (contribution_class IN ('community_counterpart','external_donation','matching_commitment')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pledged' CHECK (status IN ('pledged','movement_pending','confirmed','cancelled','failed')),
  external_instruction_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS funding_pledges_project_idx ON funding_pledges(project_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS funding_pledges_contributor_idx ON funding_pledges(contributor_id,created_at DESC);
