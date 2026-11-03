-- Additive independent-review audit. Existing object keys/digests are unchanged.
CREATE TABLE IF NOT EXISTS evidence_reviews (
  id text PRIMARY KEY,
  evidence_id text NOT NULL REFERENCES need_evidence(id),
  reviewer_id text NOT NULL CHECK (length(btrim(reviewer_id)) > 0),
  source_sha256_hex text NOT NULL CHECK (source_sha256_hex ~ '^[0-9a-f]{64}$'),
  from_status text NOT NULL CHECK (from_status = 'pending_review'),
  decision text NOT NULL CHECK (decision IN ('available','quarantined','rejected')),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 128),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(evidence_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS evidence_reviews_evidence_idx ON evidence_reviews(evidence_id,created_at);

CREATE OR REPLACE FUNCTION deny_evidence_review_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'evidence review history is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS evidence_reviews_append_only ON evidence_reviews;
CREATE TRIGGER evidence_reviews_append_only BEFORE UPDATE OR DELETE ON evidence_reviews
  FOR EACH ROW EXECUTE FUNCTION deny_evidence_review_mutation();

-- Bind every decision to immutable source metadata, including for SQL writers.
-- A declared digest can become the derived digest only at upload completion.
CREATE OR REPLACE FUNCTION guard_evidence_source_binding() RETURNS trigger AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.need_id IS DISTINCT FROM OLD.need_id
     OR NEW.uploader_id IS DISTINCT FROM OLD.uploader_id
     OR NEW.object_key IS DISTINCT FROM OLD.object_key
     OR NEW.content_type IS DISTINCT FROM OLD.content_type
     OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes THEN
    RAISE EXCEPTION 'evidence source metadata is immutable';
  END IF;
  IF NEW.sha256_hex IS DISTINCT FROM OLD.sha256_hex AND NOT
     (OLD.status = 'pending_upload' AND NEW.status = 'pending_review'
      AND NEW.sha256_hex ~ '^[0-9a-f]{64}$') THEN
    RAISE EXCEPTION 'completed evidence digest is immutable';
  END IF;
  IF NEW.status = 'pending_review' AND
     (NEW.sha256_hex IS NULL OR NEW.sha256_hex !~ '^[0-9a-f]{64}$') THEN
    RAISE EXCEPTION 'review requires a completed evidence digest';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS need_evidence_source_binding ON need_evidence;
CREATE TRIGGER need_evidence_source_binding BEFORE UPDATE ON need_evidence
  FOR EACH ROW EXECUTE FUNCTION guard_evidence_source_binding();
