CREATE TABLE IF NOT EXISTS safety_reports (
  id text PRIMARY KEY,
  reporter_id text NOT NULL,
  subject_type text NOT NULL CHECK (subject_type IN ('need','evidence','project','contribution','profile')),
  subject_id text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('fraud','privacy','harassment','hate','unsafe_activity','child_safety','misinformation','financial_abuse','other')),
  details text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'standard' CHECK (severity IN ('standard','high','critical')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','triaged','actioned','dismissed','appealed','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS safety_reports_reporter_idx ON safety_reports(reporter_id,created_at DESC);
CREATE INDEX IF NOT EXISTS safety_reports_status_idx ON safety_reports(status,severity,created_at);

CREATE TABLE IF NOT EXISTS safety_decisions (
  id text PRIMARY KEY,
  report_id text NOT NULL REFERENCES safety_reports(id) ON DELETE CASCADE,
  reviewer_id text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('triage','action','dismiss','close')),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS safety_decisions_report_idx ON safety_decisions(report_id,created_at);

CREATE TABLE IF NOT EXISTS safety_appeals (
  id text PRIMARY KEY,
  report_id text NOT NULL REFERENCES safety_reports(id) ON DELETE CASCADE,
  appellant_id text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewing','upheld','overturned','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS safety_appeals_report_idx ON safety_appeals(report_id,created_at DESC);
