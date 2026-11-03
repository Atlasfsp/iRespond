# ImpactOS & Impact Intelligence — Institutional Product + Measurement Engineering

**Priority:** P1 impact foundation; P2 institution pilot. **Issues:** #72 (measured outcomes), #74 (institutions), related #53 GA. **Reuse:** YSQL, `internal/projects`, `internal/impact`, `internal/funding`, verified evidence, audited role policy and existing Impact Passport. **No second standalone ERP.**

## Product architecture and packaging
- **iRespond Community**: public discovery/report/contribution, project participation, verified Impact Passport.
- **ImpactOS for institutions**: multi-tenant programme portfolios for NGOs, charities, foundations, CSR teams, universities and community associations; project rooms, milestone/task allocation, volunteer engagement, evidence review, outcomes and maintenance. Launch this as an edition of iRespond, not independent conflicting database.
- **Trust & Impact Registry** (later): consent-safe attestation and exported audit record for eligible verified work, not a token system or automatic government recognition.
- **Resilience** (later): safeguarded crisis coordination only after local owner training and emergency controls.

Institution tiers should be tested with pilots; don't invent prices, ROI, logos, volunteer counts or customer commitments. First target 1–2 pilot institutions with clear records and actual users before adding broad verticals.

## Domain model proposals
### Institution foundation
- `institutions`: id, legal_display_name, verification_status, tenant_id, domain, country, privacy classification, created_by, approved_by, timestamps.
- `institution_memberships`: principal, organization, role, invitation/accept state, expiry, consent, auditor.
- `programmes`: institution scope, outcomes hypothesis, public/private campaign description, project IDs, budget *pledge* fields (not funds received), period, owner, risk category, publication policy.
- `programme_tasks`: action project ID, skill requirements, safe location, capacity, eligibility/safeguarding, duration, due date, state and assigned coordinator.
- `programme_reports`: versioned source refs, generated summary, redaction/audit, review state, export hash, date and actor.
- `beneficiary_feedback`: consented feedback with sensitivity and redaction; do not make participation conditional on public testimonial.

### Evidence-based impact domain
Define `intervention_goal`, `baseline_observation`, `indicator_definition`, `measurement_observation`, `outcome_claim`, `review_attestation`, `community_challenge`, `maintenance_review`, `attribution_assessment`.

**Measurement semantics**:
- *Activity* = volunteer event/project task took place; not yet outcome.
- *Output* = delivered goods/services or hours logged, supported by evidence.
- *Outcome* = measured change for affected group over time, with baseline/denominator/method.
- *Attribution* = evidence of causal contribution; unless supported by rigorous methodology, label **descriptive** or **contribution-assessed**, not causally proven.
- *Durability* = follow-up/maintenance evidence at dated intervals, not guaranteed perpetuity.

Example: “40 volunteers cleaned a drainage channel” may be a **verified output** with attendance and media; “flood incidents decreased” is **an outcome hypothesis** until baseline, time window, comparison, environmental covariates, measurement method and independent reviewer exist. A dashboard must not collapse these into a single unsupported point score.

## Outcome JSON schema and migration path
PR #71 already contains a **proposal only** at `docs/contracts/impact-outcome.v1.proposal.schema.json`. Treat it as an architectural input, **not** a production API contract. Modify the proposal via ADR, connect to actual `internal/impact`, and add versioned tables and HTTP methods incrementally. Require:

- `indicator.kind` `output | outcome | maintenance`, named units and population denominator.
- `baseline`, `target`, `measurement` values, dates, methods, sampling and caveats.
- Evidence IDs with immutable SHA-256 and reviewer states; allow missing baselines but label them unknown.
- `review.state` `draft → submitted → under_review → approved/disputed/rejected`; lawful appeal and corrections.
- `privacy` classification, consent, publicity permission, safe geo precision and retention.
- `attribution.claimLevel`: `descriptive | contribution_assessed | causal_estimate` plus method approval/reference.
- SDG tags (1–17) and conceptual UNV GIVE tags: value to individual, community, economic value, enabling environment.
- Maintenance due date with follow-up cadence and evidence.
- Audit trail, writer/reviewer separation and optimistic concurrency or YSQL locks.

The UNV 2026 SWVR describes GIVE as a four-dimensional volunteer-engagement framework. iRespond's conceptual mapping **does not** mean GIVE is an official accreditation, comparable universal metric or causal certification. See https://www.unv.org/sites/default/files/The%202026%20SWVR%20Web%20Version.pdf.

## Institutional journey end-to-end
1. Org owner applies; human validation of legal identity/appropriate controls.
2. Tenant-scoped admin activates institution and members; StratoID and SS-13 authorize every programme/project action.
3. Coordinator creates programme and explicit hypothesis, indicators, baseline plan, safeguards and approval policy.
4. Community participant reports need; verification remains separate. Project converts from confirmed need only.
5. Team creates volunteering opportunities; eligibility and matching are consented and explicit; invitation limits.
6. Contributor commits; coordinator accepts; fulfilment evidenced and reviewed.
7. Reviewer validates output evidence; outcome assessor separately records measured change with uncertainty.
8. Beneficiary/community voice can challenge a misleading outcome; programme owner corrects report/version.
9. ImpactOS generates privacy-safe report; provenance and denominators visible; missing data prominent.
10. Maintenance owner performs dated follow-up; completed work can later be replicated with a new evidence lineage.

## UI views and role permissions
| View | Who sees it | Required data state |
|---|---|---|
| Community report | public safe projection | unverified labeled until review |
| Programme portfolio | institution member | tenant and role filtered |
| Opportunity detail | eligible participant, safe public | published tasks and coarse location |
| Task assignment | authorized coordinator | accepted actual volunteer commitments |
| Evidence-review queue | reviewer/safety team | pending, quarantined and accessible by policy only |
| Outcome measurement | project owner drafts; reviewer approves | named baseline, evidence, sampling, missingness |
| Impact Passport | contributor | source-evidenced activities and verified output; measured outcomes separately |
| Funding/pledges | entitled stakeholders | commitments only; no settlement language |
| Quarterly institutional report | approved report audience | version, date, methodology, caveats, redacted evidence |

## Pilot deployment
**Suggested initial segments:** NGO/foundation partner, corporate community-impact programme, and university service learning; select at most two to validate operations. Assign signed owner for beneficiary privacy, safeguarding and data retention.

Pilot must use consenting real participants and an approved low-risk action (e.g. community cleanup or school equipment maintenance). Avoid first pilots involving emergency rescue, minors' medical conditions, trafficking or protected locations.

## Measurement design and metric dictionary
| Metric | Definition | Denominator / evidence | Guardrail |
|---|---|---|---|
| Valid report rate | reports with valid coordinate/consent/evidence fields / submitted reports | all actual attempts, time window | duplicates tracked, not hidden |
| Verification lead time | creation → authorized outcome of review | cohort of reports entering verification | don't measure only approved reports |
| Verified response rate | needs with actual accepted response in interval / eligible verified needs | eligible cohort | separate rejected/disputed |
| Match acceptance | accepted match proposals / consented delivered proposals | eligible shown recommendations | report opt-outs and bias |
| Fulfilment | fulfilled commitments / accepted commitments | original accepted cohort | failed/cancelled explicit |
| Evidence coverage | reviewed output items with valid evidence / claimed items | item and project sample | hash/reference verified |
| Baseline completeness | outcome claims with valid pre-intervention baseline / outcome claims | defined claims | no fabricated baseline |
| Outcome change | follow-up measurement minus baseline, context-specific | indicator and cohort | note sampling and confounders |
| Durability | maintained interventions at 30/90/180 days / those due for review | follow-ups due in period | missing counts as unknown, not success |
| Equity and accessibility | measured task completion/perceived burden across consented groups | eligible accessible sample | minimize sensitive demographic data |
| Cost per evidenced outcome | approved programme costs / evidence-backed outcomes | denominators named, currency and period | avoid cross-programme ranking without method |

Proposed threshold examples (not actual results): 100% cross-tenant access denied in negative tests; 0 unsupported payout states; 100% approved claims have reviewer/audit trace; 100% new programme public reports have publication policy. Pilot conversion and retention targets should be set **after** baseline measurement, not invented.

## Quality and external decision gates
- Additive YSQL migrations and rollback, idempotent creation, lock and event tests.
- Negative tests for tenant crossing, forged org invites, coordinator self-approval, unapproved evidence, role drift, report export privacy and appeal.
- E2E instrumented scenario: need → verified → project → task → volunteer → fulfilled output → outcome measurement → reviewed report → 90-day maintenance.
- Genuine experience research: role-based desktop and mobile workflows, accessibility, localization and low-bandwidth paths.
- Pilot acceptance from institution owner + community beneficiary representatives and legal/privacy oversight.
- Independent verification and external GA remain separate; successful pilot does not make all of iRespond GA.

## Codex execution prompt
> Inspect current YSQL migrations, project roles, funding pledge domain, Impact Passport and proposal schema. Draft ADR-002/004 and implement an additive tenant-isolated Impact Intelligence foundation on short-lived branches. Integrate real source-evidenced outputs, approved outcome measurements, beneficiary challenges and maintenance reviews. Separate reporter, coordinator and independent reviewer permissions. Then deliver a permission-governed institutional ImpactOS pilot with programme/tasks/reporting, preserving FIELDWORK UX. No fabricated analytics; pilot KPIs show “not yet measured” until real data exists. Require human sign-offs and tests before exposing institution features. Link delivery to GitHub issues #72 and #74.
