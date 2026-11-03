# Volunteer & Skills Cloud — Opt-in Matching Architecture

**Priority:** P1/P2 after trust foundation. **Issue:** #73. **Core doctrine:** Response to Ability and 3P (Place, Position, Possessions/Capabilities).

## Product promise
Help people make real, useful contributions based on time, skills, accessibility needs, capacity and safe location constraints. Do not use misleading “AI matched” labels when no placement occurred. A recommendation is **not** an invitation, an accepted invitation is **not** fulfilled work, and completed work is **not** automatically independently verified community impact.

## Participant-centred domain entities
| Entity | Fields / lifecycle | Privacy and policy |
|---|---|---|
| Ability Profile | opt-in skills/tags, validated credentials only if appropriate, languages, remote/on-site, availability windows, access requirements, preference categories, capacity/maximum commitments, profile updated time | subject owns it; consent; no public sensitive attributes |
| Opportunity | verified project/programme ID, task category, essential/optional skills, location policy, equipment/safeguarding needs, time window, team capacity, visibility | coordinator authorized, review before public display |
| Recommendation | requested by, opportunity ID, fit reasons, model version if any, explanation, timestamp, feature sources, consent scope, expiry | only subject/authorized coordinator; no raw private signals in logs |
| Application | person indicates interest, optionally supplies qualifications, status: applied/invited/accepted/declined/cancelled | idempotency, anti-harassment |
| Assignment | coordinator approves acceptance, dates, safe site details, cancellation reason, audit, check-in/out when lawful | no location reveal before approval |
| Fulfilment | task actions, duration if relevant, evidence refs, coordinator/reviewer state | evidence access reviewed; no automatic passport award |
| Matching Audit | eligibility set, rule version, fairness snapshot aggregate, human override reason | protected; pseudonymized, retention |

## Algorithm phased delivery
**Phase 1, deterministic eligibility and ranking** — do before AICO:
1. Eligible if user opted in and consent active; opportunity is published and safe; age/safeguarding/permission policies satisfied; capacity not full; date constraints compatible.
2. Hard exclusions: no consent, inappropriate age or clearance, disallowed identity/tenant, protected location conflict, required certification absent (where verified), prior volunteer opt-out.
3. Score only among eligible candidates, e.g. essential skill coverage 35%, availability overlap 30%, accessibility/format fit 15%, preferred cause alignment 10%, travel burden 10%. **These are trial weights only**; tune with user studies and real opt-in outcomes. Accessibility needs should guide accommodation and never unfairly lower candidate eligibility.
4. Use coarse user-chosen location bands, not exact home coordinate; do not publish full volunteer location to coordinators before consent.
5. Explain scores in plain language: “Your available Saturday window and first-aid training align with this approved programme”; avoid hidden sensitive inferences.
6. Support self-browse and manual coordinator matching for all participants, regardless of AI access.
7. Restrict outreach: per-person weekly contact ceilings, opt-out, silence-hours handling, complaints, block/coordinator reporting.

**Phase 2, proposal-only AI reranking**
- Let AICO identify semantic skill equivalence and alternatives to rigid labels; constrain it to vetted, minimally necessary features.
- It may propose contact, never send without human authorization; no automated discrimination, rejection or unsafe transportation decisions.
- Keep deterministic decisions and explanation available if AICO is disabled/unavailable. Monitor measured gains, false matches, refusals, and volunteer dissatisfaction.

## Fairness and accessibility
- Skills-based matching is useful but can disadvantage informal community expertise. Include **self-declared local knowledge**, lived experience, languages, care, availability and possessions/capabilities with suitable verification labels.
- Avoid requiring certificates for harmless work; require legitimate safeguarding/certification only when task risk demands it.
- Do not infer age, disability, ethnicity, migration status or socioeconomic background from behavior. Any legally relevant restriction should be an explicit approved policy, not model inference.
- Support low-data/offline application queues, accessible invitation prompts, phone/SMS only with consent and compliant providers, and calendar/time zone display.
- Human moderation for urgent care, emergencies, contact with children or exposed vulnerable persons; exclude from the initial automated pilot.

## Side-effect and audit contract
An assistant can return an immutable `MatchProposal` with `eligible=true/false`, explanation, reasons and confidence, but it **cannot** create `Assignment` until authenticated person/coordinator confirms. Auditable transitions:
```
profile_opt_in → proposal → participant_interest → coordinator_review
    → accepted_assignment → check-in/task activity → evidence_submission
    → independent_review → fulfilled_or_disputed → impact_passport_projection
```
Every transition has actor identity, policy decision, version, idempotency key and outbox event. Refuse `submitted` → `fulfilled` without authorized real evidence state.

## API/state design notes
- `PUT /v1/me/ability-profile`: allow partial update, consent version and withdrawal, actor=self.
- `POST /v1/opportunities/{id}/applications`: idempotent self-application with server eligibility enforcement.
- `POST /v1/opportunities/{id}/matches/evaluate`: candidate-only ranking/proposal in scoped context; no PII in external model prompt by default.
- `POST /v1/applications/{id}/decision`: coordinator authorization, reason and non-discrimination oversight.
- `POST /v1/applications/{id}/fulfilment`: evidence IDs, reviewer-controlled actual completion.
- Use existing `contribution_offers` contract wherever possible. Avoid duplicate accepted/fulfilled authority across old and new tables; plan mapping in ADR.

## Critical tests
- consent withdrawn during ranking, no recommendation nor use after revocation;
- user belongs to org A, request for org B participants → denied;
- private disability/accessibility preferences never returned to unrelated coordinators;
- no hidden profile inference from media/social posts;
- same invitation accepted twice, exactly-once task assignment;
- capacity contested under concurrent accepted applications;
- invalid/missing certificates (if required) block assignment without profiling;
- volunteer with no formal certificates can access safe tasks;
- long-distance matches, sparse communities and intermittent connectivity;
- model hallucinated credential, disabled AICO gateway and high-cost prompt;
- malicious prompt injection in project narrative cannot grant privilege;
- cancellations and withdrawn consent propagate to notifications and reporting;
- unfair match concentration and coordinator spam measured via review dashboard.

## Acceptance + pilot
- Minimum viable matching: complete self-serve profile, project opportunity, deterministic recommendation and human confirmation in a real consented pilot.
- 100% negative authorization tests pass; no sensitive location disclosed by public APIs; no automatic high-risk placement.
- Trace request → ranking version → human decision → acceptance → verified task fulfillment; actual event source all the way to Impact Passport.
- Baseline metrics: application-to-acceptance, fulfilment, time saved for coordinators, opt-out rate, matching fairness and accessibility task completion. Record unknown until measured.
- Do not promise global scale or partnership conversion before independent evidence.

## Codex execution prompt
> Reuse existing iRespond contribution offers and project permissions. Write ADR-005 for opt-in ability profiles, eligibility policy, matching score/rules, consent and safeguarding. Implement a deterministic server-authoritative matcher and human-approved application/assignment flow with YSQL persistence, OpenAPI, UI and adversarial tenant/privacy tests. Ensure any future AICO reranker is optional, non-authoritative and does not autonomously send messages or create commitments. Pilot against real approved non-sensitive opportunities; measure acceptance/fulfilment rather than click metrics. Deliver PRs linked to #73.
