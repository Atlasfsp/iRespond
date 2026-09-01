ALTER TABLE safety_reports DROP CONSTRAINT IF EXISTS safety_reports_subject_type_check;
ALTER TABLE safety_reports ADD CONSTRAINT safety_reports_subject_type_check
  CHECK (subject_type IN ('need','evidence','project','contribution','profile','platform'));
