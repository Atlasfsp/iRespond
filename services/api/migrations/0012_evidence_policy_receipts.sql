-- Preserve historical reviews as tenant/policy UNKNOWN. Never invent a backfill.
ALTER TABLE evidence_reviews ADD COLUMN IF NOT EXISTS tenant_id text;
ALTER TABLE evidence_reviews ADD COLUMN IF NOT EXISTS policy_decision_id text;

CREATE OR REPLACE FUNCTION require_evidence_review_policy_receipt() RETURNS trigger AS $$
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.tenant_id !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(/[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?){0,7}$'
     OR NEW.policy_decision_id IS NULL OR length(btrim(NEW.policy_decision_id)) NOT BETWEEN 1 AND 512 THEN
    RAISE EXCEPTION 'new evidence reviews require tenant and resource policy receipt';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS evidence_reviews_policy_receipt ON evidence_reviews;
CREATE TRIGGER evidence_reviews_policy_receipt BEFORE INSERT ON evidence_reviews
  FOR EACH ROW EXECUTE FUNCTION require_evidence_review_policy_receipt();
