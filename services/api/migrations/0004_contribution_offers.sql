CREATE TABLE IF NOT EXISTS contribution_offers (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES action_projects(id) ON DELETE CASCADE,
  contribution_need_id text NOT NULL REFERENCES contribution_needs(id) ON DELETE CASCADE,
  contributor_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('money','time','skill','materials','equipment','transport','knowledge','access','influence','care','approval','space','leadership')),
  note text NOT NULL DEFAULT '',
  availability_note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'offered' CHECK (status IN ('offered','accepted','declined','withdrawn','fulfilled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contribution_offers_project_idx ON contribution_offers(project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS contribution_offers_contributor_idx ON contribution_offers(contributor_id, status, created_at DESC);
