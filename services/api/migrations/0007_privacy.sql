CREATE TABLE IF NOT EXISTS privacy_consents (
  user_id text NOT NULL,
  purpose text NOT NULL,
  granted boolean NOT NULL,
  policy_version text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, purpose)
);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT privacy_request_type_check CHECK (request_type IN ('access','export','correction','deletion')),
  CONSTRAINT privacy_request_status_check CHECK (status IN ('requested','in_progress','completed','rejected'))
);
CREATE INDEX IF NOT EXISTS privacy_requests_user_idx ON privacy_requests(user_id, requested_at DESC);
