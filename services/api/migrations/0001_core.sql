CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS needs (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT '',
  reporter_id text NOT NULL DEFAULT '',
  verification_state text NOT NULL,
  sdg_tags integer[] NOT NULL DEFAULT '{}',
  location geography(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT needs_verification_state_check CHECK (verification_state IN (
    'observed','verification_requested','community_confirmed','institution_confirmed',
    'expert_confirmed','independently_audited','government_confirmed','disputed','rejected'
  ))
);

CREATE INDEX IF NOT EXISTS needs_location_gix ON needs USING gist(location);
CREATE INDEX IF NOT EXISTS needs_verification_state_idx ON needs(verification_state);
CREATE INDEX IF NOT EXISTS needs_updated_at_idx ON needs(updated_at DESC);

CREATE TABLE IF NOT EXISTS need_verifications (
  id text PRIMARY KEY,
  need_id text NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
  verifier_id text NOT NULL,
  state text NOT NULL,
  note text,
  evidence_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS need_verifications_need_idx ON need_verifications(need_id, created_at DESC);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  scope text NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(scope, key)
);
CREATE INDEX IF NOT EXISTS idempotency_expiry_idx ON idempotency_keys(expires_at);

CREATE TABLE IF NOT EXISTS outbox_events (
  id text PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox_events(occurred_at) WHERE published_at IS NULL;
