-- 0014_challenges_domain.sql
-- Additive YugabyteDB / YSQL schema for iRespond Challenges (WP-02 / D5).
-- Preserves all 0001-0013 tables, outbox_events, and idempotency_keys.
-- All IDs are opaque text identifiers allocated server-side.
-- All tenant/actor IDs originate in the verified StratoID / SS-13 trust boundary.

BEGIN;

CREATE TABLE IF NOT EXISTS challenge_programs (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 slug text NOT NULL,
 title text NOT NULL,
 description text NOT NULL DEFAULT '',
 mission text NOT NULL DEFAULT '',
 owner_actor_id text NOT NULL,
 jurisdiction_code text NOT NULL DEFAULT '',
 locale text NOT NULL DEFAULT 'en',
 timezone text NOT NULL DEFAULT 'UTC',
 currency_code text,
 location_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
 visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','listed','public')),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','scheduled','registration_open','active','judging','results_pending','results_published','archived','cancelled')),
 current_rules_version integer NOT NULL DEFAULT 0 CHECK (current_rules_version >= 0),
 registration_opens_at timestamptz,
 registration_closes_at timestamptz,
 starts_at timestamptz,
 ends_at timestamptz,
 result_appeal_closes_at timestamptz,
 version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (tenant_id,id), UNIQUE (tenant_id,slug),
 CHECK (currency_code IS NULL OR length(currency_code)=3),
 CHECK (registration_opens_at IS NULL OR registration_closes_at IS NULL OR registration_opens_at < registration_closes_at),
 CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
 CHECK (jsonb_typeof(location_scope)='object')
);
CREATE INDEX IF NOT EXISTS challenge_programs_tenant_status_idx ON challenge_programs(tenant_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS challenge_programs_public_idx ON challenge_programs(visibility,status,registration_closes_at);

CREATE TABLE IF NOT EXISTS challenge_program_versions (
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 rules_version integer NOT NULL CHECK (rules_version >= 1),
 rules_snapshot jsonb NOT NULL,
 content_sha256 text NOT NULL CHECK (length(content_sha256)=64),
 approved_by_actor_id text NOT NULL,
 second_approver_actor_id text NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,program_id,rules_version),
 FOREIGN KEY (tenant_id,program_id) REFERENCES challenge_programs(tenant_id,id) ON DELETE RESTRICT,
 CHECK (approved_by_actor_id <> second_approver_actor_id),
 CHECK (jsonb_typeof(rules_snapshot)='object')
);

CREATE TABLE IF NOT EXISTS challenge_rule_approvals (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 rules_sha256 text NOT NULL CHECK(length(rules_sha256)=64),
 approver_actor_id text NOT NULL,
 decision text NOT NULL CHECK(decision IN ('approve','reject')),
 reason_restricted text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,program_id,rules_sha256,approver_actor_id),
 FOREIGN KEY(tenant_id,program_id) REFERENCES challenge_programs(tenant_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS challenge_rule_approvals_by_digest_idx ON challenge_rule_approvals(tenant_id,program_id,rules_sha256,decision);

CREATE TABLE IF NOT EXISTS challenge_tracks (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 title text NOT NULL,
 description text NOT NULL DEFAULT '',
 level_code text NOT NULL DEFAULT 'open',
 participation_mode text NOT NULL DEFAULT 'both' CHECK (participation_mode IN ('individual','team','both')),
 minimum_team_members integer NOT NULL DEFAULT 1 CHECK (minimum_team_members >= 1),
 maximum_team_members integer NOT NULL DEFAULT 1 CHECK (maximum_team_members >= minimum_team_members),
 minimum_age integer CHECK (minimum_age BETWEEN 0 AND 120),
 maximum_age integer CHECK (maximum_age BETWEEN 0 AND 120),
 enrolment_limit integer CHECK (enrolment_limit > 0),
 policy jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,program_id,id),
 FOREIGN KEY(tenant_id,program_id) REFERENCES challenge_programs(tenant_id,id) ON DELETE RESTRICT,
 CHECK(minimum_age IS NULL OR maximum_age IS NULL OR minimum_age <= maximum_age)
);
CREATE INDEX IF NOT EXISTS challenge_tracks_program_idx ON challenge_tracks(tenant_id,program_id);

CREATE TABLE IF NOT EXISTS challenge_rounds (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 sequence integer NOT NULL CHECK (sequence >= 1),
 title text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('qualification','proposal','mentorship','implementation','finale','other')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','open','closed','judging','completed','cancelled')),
 opens_at timestamptz NOT NULL,
 closes_at timestamptz NOT NULL,
 judging_closes_at timestamptz,
 required_judges integer NOT NULL DEFAULT 2 CHECK(required_judges BETWEEN 1 AND 20),
 scoring_algorithm text NOT NULL DEFAULT 'weighted_median_v1' CHECK(scoring_algorithm IN ('weighted_mean_v1','weighted_median_v1')),
 rubric_version integer NOT NULL DEFAULT 1 CHECK(rubric_version >= 1),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,program_id,id), UNIQUE(tenant_id,program_id,sequence),
 FOREIGN KEY (tenant_id,program_id) REFERENCES challenge_programs(tenant_id,id) ON DELETE RESTRICT,
 CHECK(opens_at < closes_at),
 CHECK(judging_closes_at IS NULL OR judging_closes_at >= closes_at)
);
CREATE INDEX IF NOT EXISTS challenge_rounds_program_idx ON challenge_rounds(tenant_id,program_id,sequence);

CREATE TABLE IF NOT EXISTS challenge_rubric_criteria (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 round_id text NOT NULL,
 rubric_version integer NOT NULL CHECK (rubric_version >= 1),
 sequence integer NOT NULL CHECK(sequence >= 1),
 code text NOT NULL,
 title text NOT NULL,
 description text NOT NULL DEFAULT '',
 weight_basis_points integer NOT NULL CHECK(weight_basis_points BETWEEN 1 AND 10000),
 maximum_score numeric(6,2) NOT NULL DEFAULT 100 CHECK(maximum_score > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,program_id,round_id,rubric_version,sequence),
 UNIQUE(tenant_id,program_id,round_id,rubric_version,code),
 FOREIGN KEY (tenant_id,program_id,round_id) REFERENCES challenge_rounds(tenant_id,program_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS challenge_rubric_round_idx ON challenge_rubric_criteria(tenant_id,program_id,round_id,rubric_version);

CREATE TABLE IF NOT EXISTS challenge_entries (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 track_id text NOT NULL,
 lead_actor_id text NOT NULL,
 entry_code text NOT NULL,
 team_display_name text,
 participation_mode text NOT NULL CHECK(participation_mode IN ('individual','team')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','applied','screening','eligible','needs_information','ineligible','accepted','withdrawn','disqualified')),
 eligibility_status text NOT NULL DEFAULT 'unreviewed' CHECK(eligibility_status IN ('unreviewed','pending','eligible','ineligible','needs_information','appealed')),
 agreed_rules_version integer NOT NULL CHECK(agreed_rules_version >= 1),
 restricted_profile_ref text,
 version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
 applied_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,program_id,id), UNIQUE(tenant_id,program_id,entry_code),
 FOREIGN KEY(tenant_id,program_id) REFERENCES challenge_programs(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,program_id,track_id) REFERENCES challenge_tracks(tenant_id,program_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,program_id,agreed_rules_version) REFERENCES challenge_program_versions(tenant_id,program_id,rules_version) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS challenge_entries_tenant_program_status_idx ON challenge_entries(tenant_id,program_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS challenge_entries_lead_idx ON challenge_entries(tenant_id,lead_actor_id,created_at DESC);

CREATE TABLE IF NOT EXISTS challenge_team_members (
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 entry_id text NOT NULL,
 actor_id text NOT NULL,
 member_role text NOT NULL DEFAULT 'member' CHECK(member_role IN ('lead','member','advisor')),
 invitation_state text NOT NULL DEFAULT 'invited' CHECK(invitation_state IN ('invited','accepted','declined','revoked','removed')),
 verified_institution_ref text,
 guardian_consent_status text NOT NULL DEFAULT 'not_applicable' CHECK(guardian_consent_status IN ('not_applicable','required','pending','verified','revoked')),
 joined_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,entry_id,actor_id),
 FOREIGN KEY(tenant_id,program_id,entry_id) REFERENCES challenge_entries(tenant_id,program_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS challenge_members_actor_idx ON challenge_team_members(tenant_id,actor_id,invitation_state);

CREATE TABLE IF NOT EXISTS challenge_guardian_consents (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 entry_id text NOT NULL,
 participant_actor_id text NOT NULL,
 guardian_subject_ref text NOT NULL,
 ss24_consent_receipt_ref text NOT NULL,
 purpose_code text NOT NULL,
 rules_version integer NOT NULL CHECK(rules_version >= 1),
 status text NOT NULL CHECK(status IN ('pending','verified','revoked','expired')),
 verified_by_actor_id text,
 verified_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,program_id,entry_id) REFERENCES challenge_entries(tenant_id,program_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,entry_id,participant_actor_id) REFERENCES challenge_team_members(tenant_id,entry_id,actor_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS challenge_consents_member_idx ON challenge_guardian_consents(tenant_id,entry_id,participant_actor_id,purpose_code,status);

CREATE TABLE IF NOT EXISTS challenge_eligibility_decisions (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 entry_id text NOT NULL,
 decision text NOT NULL CHECK(decision IN ('eligible','ineligible','needs_information','exception_approved','exception_rejected')),
 rule_code text NOT NULL,
 rationale_restricted text NOT NULL DEFAULT '',
 reviewer_actor_id text NOT NULL,
 evidence_ref text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,program_id,entry_id) REFERENCES challenge_entries(tenant_id,program_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS challenge_eligibility_entry_idx ON challenge_eligibility_decisions(tenant_id,entry_id,created_at DESC);

CREATE TABLE IF NOT EXISTS challenge_submissions (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 entry_id text NOT NULL,
 round_id text NOT NULL,
 revision integer NOT NULL CHECK(revision >= 1),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','under_review','qualified','revision_requested','declined','locked','withdrawn')),
 problem_statement text NOT NULL DEFAULT '',
 solution_proposal text NOT NULL DEFAULT '',
 resource_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
 expected_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
 public_abstract text NOT NULL DEFAULT '',
 submitted_by_actor_id text,
 submitted_at timestamptz,
 submission_sha256 text CHECK(submission_sha256 IS NULL OR length(submission_sha256)=64),
 version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,program_id,id),
 UNIQUE(tenant_id,entry_id,round_id,revision),
 FOREIGN KEY(tenant_id,program_id,entry_id) REFERENCES challenge_entries(tenant_id,program_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,program_id,round_id) REFERENCES challenge_rounds(tenant_id,program_id,id) ON DELETE RESTRICT,
 CHECK((status NOT IN ('submitted','under_review','qualified','locked')) OR (submitted_at IS NOT NULL AND submission_sha256 IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS challenge_submissions_entry_idx ON challenge_submissions(tenant_id,entry_id,round_id,revision DESC);
CREATE INDEX IF NOT EXISTS challenge_submissions_round_status_idx ON challenge_submissions(tenant_id,program_id,round_id,status,submitted_at DESC);

CREATE TABLE IF NOT EXISTS challenge_submission_evidence (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 submission_id text NOT NULL,
 ss42_asset_ref text NOT NULL,
 sha256_hex text CHECK(sha256_hex IS NULL OR length(sha256_hex)=64),
 content_kind text NOT NULL CHECK(content_kind IN ('image','video','audio','document','other')),
 access_class text NOT NULL CHECK(access_class IN ('restricted','participant','reviewer','public_redacted')),
 moderation_status text NOT NULL DEFAULT 'pending' CHECK(moderation_status IN ('pending','approved','quarantined','rejected','revoked')),
 uploader_actor_id text NOT NULL,
 consent_ref text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,submission_id,ss42_asset_ref),
 FOREIGN KEY(tenant_id,program_id,submission_id) REFERENCES challenge_submissions(tenant_id,program_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS challenge_submission_assets_idx ON challenge_submission_evidence(tenant_id,submission_id,moderation_status);

CREATE TABLE IF NOT EXISTS challenge_judge_assignments (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 submission_id text NOT NULL,
 judge_actor_id text NOT NULL,
 assignment_status text NOT NULL DEFAULT 'proposed' CHECK(assignment_status IN ('proposed','accepted','recused','completed','revoked')),
 conflict_status text NOT NULL DEFAULT 'undisclosed' CHECK(conflict_status IN ('undisclosed','no_conflict_declared','conflict_declared','independently_cleared','recused')),
 assigned_by_actor_id text NOT NULL,
 assigned_at timestamptz NOT NULL DEFAULT now(),
 accepted_at timestamptz,
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,submission_id,judge_actor_id),
 FOREIGN KEY(tenant_id,program_id,submission_id) REFERENCES challenge_submissions(tenant_id,program_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS challenge_judges_actor_idx ON challenge_judge_assignments(tenant_id,judge_actor_id,assignment_status);

CREATE TABLE IF NOT EXISTS challenge_judge_conflicts (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 assignment_id text NOT NULL,
 reason_code text NOT NULL,
 reason_restricted text NOT NULL DEFAULT '',
 resolution text NOT NULL DEFAULT 'pending' CHECK(resolution IN ('pending','cleared','recused')),
 reported_by_actor_id text NOT NULL,
 resolved_by_actor_id text,
 resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,assignment_id) REFERENCES challenge_judge_assignments(tenant_id,id) ON DELETE RESTRICT,
 CHECK(resolution='pending' OR resolved_by_actor_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS challenge_conflicts_assignment_idx ON challenge_judge_conflicts(tenant_id,assignment_id,created_at DESC);

CREATE TABLE IF NOT EXISTS challenge_scorecards (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 assignment_id text NOT NULL,
 rubric_version integer NOT NULL CHECK(rubric_version >= 1),
 revision integer NOT NULL DEFAULT 1 CHECK(revision >= 1),
 supersedes_scorecard_id text,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','sealed','voided')),
 total_basis_points integer CHECK(total_basis_points BETWEEN 0 AND 10000),
 private_overall_comment text NOT NULL DEFAULT '',
 submitted_at timestamptz,
 sealed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,assignment_id,revision),
 FOREIGN KEY(tenant_id,assignment_id) REFERENCES challenge_judge_assignments(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,supersedes_scorecard_id) REFERENCES challenge_scorecards(tenant_id,id) ON DELETE RESTRICT,
 CHECK(status NOT IN ('submitted','sealed') OR (total_basis_points IS NOT NULL AND submitted_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS challenge_scorecards_status_idx ON challenge_scorecards(tenant_id,program_id,status);

CREATE TABLE IF NOT EXISTS challenge_score_lines (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 scorecard_id text NOT NULL,
 criterion_id text NOT NULL,
 score numeric(6,2) NOT NULL CHECK(score >= 0),
 rationale_restricted text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,scorecard_id,criterion_id),
 FOREIGN KEY(tenant_id,scorecard_id) REFERENCES challenge_scorecards(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,criterion_id) REFERENCES challenge_rubric_criteria(tenant_id,id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS challenge_decisions (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 round_id text NOT NULL,
 entry_id text NOT NULL,
 decision text NOT NULL CHECK(decision IN ('qualified','not_qualified','finalist','winner','runner_up','disqualified','no_award')),
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','reviewed','approved','published','superseded','revoked')),
 rank integer CHECK(rank >= 1),
 score_basis_points integer CHECK(score_basis_points BETWEEN 0 AND 10000),
 source_scorecard_ids text[] NOT NULL DEFAULT '{}',
 reason_restricted text NOT NULL DEFAULT '',
 created_by_actor_id text NOT NULL,
 approved_by_actor_id text,
 published_by_actor_id text,
 published_at timestamptz,
 revision integer NOT NULL DEFAULT 1 CHECK(revision >= 1),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,program_id,id),
 UNIQUE(tenant_id,program_id,round_id,entry_id,revision),
 FOREIGN KEY(tenant_id,program_id,round_id) REFERENCES challenge_rounds(tenant_id,program_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,program_id,entry_id) REFERENCES challenge_entries(tenant_id,program_id,id) ON DELETE RESTRICT,
 CHECK(state <> 'published' OR (approved_by_actor_id IS NOT NULL AND published_by_actor_id IS NOT NULL AND published_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS challenge_decisions_public_idx ON challenge_decisions(tenant_id,program_id,round_id,state,rank);

CREATE TABLE IF NOT EXISTS challenge_appeals (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 entry_id text NOT NULL,
 round_id text,
 subject_type text NOT NULL CHECK(subject_type IN ('eligibility','scoring','round_decision','award','safety')),
 subject_id text NOT NULL,
 appellant_actor_id text NOT NULL,
 reason_restricted text NOT NULL,
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','admissibility_review','investigating','upheld','denied','remanded','withdrawn','closed')),
 reviewer_actor_id text,
 decision_reason_restricted text,
 submitted_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,program_id,entry_id) REFERENCES challenge_entries(tenant_id,program_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,program_id,round_id) REFERENCES challenge_rounds(tenant_id,program_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS challenge_appeals_status_idx ON challenge_appeals(tenant_id,program_id,status,submitted_at);

CREATE TABLE IF NOT EXISTS challenge_prizes (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 title text NOT NULL,
 prize_kind text NOT NULL CHECK(prize_kind IN ('cash','school_materials','equipment','experience','scholarship','mentorship','project_grant','other_in_kind')),
 currency_code text,
 amount_minor bigint,
 in_kind_description text,
 sponsor_id text,
 published_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','announced','withdrawn','closed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,program_id,id),
 FOREIGN KEY(tenant_id,program_id) REFERENCES challenge_programs(tenant_id,id) ON DELETE RESTRICT,
 CHECK(amount_minor IS NULL OR amount_minor > 0),
 CHECK(currency_code IS NULL OR length(currency_code)=3),
 CHECK(prize_kind <> 'cash' OR (amount_minor IS NOT NULL AND currency_code IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS challenge_awards (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 entry_id text NOT NULL,
 decision_id text,
 prize_id text NOT NULL,
 status text NOT NULL DEFAULT 'nominated' CHECK(status IN ('nominated','approved','published','revoked')),
 nominated_by_actor_id text NOT NULL,
 approved_by_actor_id text,
 published_by_actor_id text,
 approved_at timestamptz,
 published_at timestamptz,
 revoke_reason_restricted text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,program_id,id), UNIQUE(tenant_id,program_id,entry_id,prize_id),
 FOREIGN KEY(tenant_id,program_id,entry_id) REFERENCES challenge_entries(tenant_id,program_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,program_id,decision_id) REFERENCES challenge_decisions(tenant_id,program_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,program_id,prize_id) REFERENCES challenge_prizes(tenant_id,program_id,id) ON DELETE RESTRICT,
 CHECK(status NOT IN ('approved','published') OR approved_by_actor_id IS NOT NULL),
 CHECK(status <> 'published' OR (published_by_actor_id IS NOT NULL AND published_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS challenge_awards_program_status_idx ON challenge_awards(tenant_id,program_id,status);

CREATE TABLE IF NOT EXISTS challenge_prize_fulfillments (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 award_id text NOT NULL,
 fulfillment_kind text NOT NULL CHECK(fulfillment_kind IN ('cash_provider','in_kind_delivery','mentorship','scholarship','experience')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','provider_initiated','confirmed_delivered','failed','cancelled','disputed')),
 provider_reference text,
 delivery_evidence_ref text,
 verified_by_actor_id text,
 provider_confirmed_at timestamptz,
 delivered_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,program_id,award_id,id),
 FOREIGN KEY(tenant_id,program_id,award_id) REFERENCES challenge_awards(tenant_id,program_id,id) ON DELETE RESTRICT,
 CHECK(status <> 'confirmed_delivered' OR (verified_by_actor_id IS NOT NULL AND delivered_at IS NOT NULL)),
 CHECK(status <> 'confirmed_delivered' OR fulfillment_kind <> 'cash_provider' OR (provider_reference IS NOT NULL AND provider_confirmed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS challenge_fulfillments_award_idx ON challenge_prize_fulfillments(tenant_id,award_id,created_at DESC);

CREATE TABLE IF NOT EXISTS challenge_sponsors (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 organisation_ref text,
 sponsor_display_name text NOT NULL,
 commitment_kind text NOT NULL CHECK(commitment_kind IN ('cash','in_kind','matching','service')),
 commitment_currency text,
 commitment_amount_minor bigint,
 commitment_description text,
 status text NOT NULL DEFAULT 'interest' CHECK(status IN ('interest','verified','pledged','provider_confirmed','fulfilled','withdrawn','disputed')),
 ss22_payment_reference text,
 agreement_asset_ref text,
 approved_by_actor_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,program_id,id),
 FOREIGN KEY(tenant_id,program_id) REFERENCES challenge_programs(tenant_id,id) ON DELETE RESTRICT,
 CHECK(commitment_amount_minor IS NULL OR commitment_amount_minor > 0),
 CHECK(commitment_currency IS NULL OR length(commitment_currency)=3)
);
CREATE INDEX IF NOT EXISTS challenge_sponsors_program_idx ON challenge_sponsors(tenant_id,program_id,status);

CREATE TABLE IF NOT EXISTS challenge_mentorships (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 entry_id text NOT NULL,
 mentor_actor_id text NOT NULL,
 status text NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','accepted','active','completed','revoked')),
 safeguarding_clearance_ref text,
 approved_by_actor_id text,
 started_at timestamptz,
 ended_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,entry_id,mentor_actor_id),
 FOREIGN KEY(tenant_id,program_id,entry_id) REFERENCES challenge_entries(tenant_id,program_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS challenge_mentors_actor_idx ON challenge_mentorships(tenant_id,mentor_actor_id,status);

CREATE TABLE IF NOT EXISTS challenge_project_links (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 entry_id text NOT NULL,
 action_project_id text NOT NULL REFERENCES action_projects(id) ON DELETE RESTRICT,
 linked_by_actor_id text NOT NULL,
 relationship text NOT NULL DEFAULT 'challenge_delivery' CHECK(relationship IN ('challenge_delivery','follow_up','replication')),
 linked_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,entry_id,action_project_id),
 FOREIGN KEY(tenant_id,program_id,entry_id) REFERENCES challenge_entries(tenant_id,program_id,id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS challenge_audit_events (
 id text PRIMARY KEY,
 tenant_id text NOT NULL,
 program_id text NOT NULL,
 aggregate_type text NOT NULL,
 aggregate_id text NOT NULL,
 actor_subject text NOT NULL,
 actor_type text NOT NULL CHECK(actor_type IN ('human','service')),
 action text NOT NULL,
 before_state_hash text,
 after_state_hash text,
 policy_receipt_ref text,
 evidence_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
 request_id text,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,program_id) REFERENCES challenge_programs(tenant_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS challenge_audit_by_program_idx ON challenge_audit_events(tenant_id,program_id,occurred_at DESC,id);
CREATE INDEX IF NOT EXISTS challenge_audit_by_aggregate_idx ON challenge_audit_events(tenant_id,aggregate_type,aggregate_id,occurred_at DESC);

COMMIT;
