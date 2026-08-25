CREATE TABLE IF NOT EXISTS need_evidence (
  id text PRIMARY KEY,
  need_id text NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
  uploader_id text NOT NULL,
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 52428800),
  sha256_hex text,
  status text NOT NULL DEFAULT 'pending_upload' CHECK (status IN ('pending_upload','available','quarantined','rejected','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz
);

CREATE INDEX IF NOT EXISTS need_evidence_need_idx ON need_evidence(need_id, created_at DESC);
CREATE INDEX IF NOT EXISTS need_evidence_status_idx ON need_evidence(status, created_at DESC);
