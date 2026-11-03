-- Additive context; historical reports/evidence retain unknown provenance.
ALTER TABLE needs ADD COLUMN IF NOT EXISTS category_detail text NOT NULL DEFAULT '';
ALTER TABLE needs ADD COLUMN IF NOT EXISTS location_context jsonb;
ALTER TABLE need_evidence ADD COLUMN IF NOT EXISTS capture_context jsonb;
ALTER TABLE need_evidence ADD COLUMN IF NOT EXISTS client_attachment_id text;
CREATE UNIQUE INDEX IF NOT EXISTS need_evidence_upload_intent ON need_evidence(need_id,uploader_id,client_attachment_id) WHERE client_attachment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION guard_evidence_capture_context() RETURNS trigger AS $$
BEGIN
 IF NEW.capture_context IS DISTINCT FROM OLD.capture_context OR NEW.client_attachment_id IS DISTINCT FROM OLD.client_attachment_id THEN
  RAISE EXCEPTION 'original evidence capture context is immutable';
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS need_evidence_capture_binding ON need_evidence;
CREATE TRIGGER need_evidence_capture_binding BEFORE UPDATE ON need_evidence
 FOR EACH ROW EXECUTE FUNCTION guard_evidence_capture_context();
