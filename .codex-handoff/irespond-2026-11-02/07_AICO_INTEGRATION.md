# AICO Action Intelligence — Agent Employees, Tool Permissions and Human Control

**Priority:** P2 after deterministic matching and verified evidence. **Issue:** #73. **Scope:** use established AICO platform and roles where discoverable; do not claim or replicate the 10,000+ role/30,000+ AI employee catalogue inside iRespond. Use AICO as a governed horizontal capability, not a separate decision authority.

## Core objective
AICO should make communities and programme coordinators more capable, not substitute human accountability. AI-assisted reporting, triage, translation, volunteer skills normalization, maintenance monitoring and outcome analysis can dramatically reduce routine effort—but every consequential project assignment, evidence verification, privacy publication, funding decision and institutional authorization must have a traceable human actor.

## Contract discovery requirement
Codex must first locate the canonical AICO repo/services (do not infer URL), read its role and skill registry, orchestration policies, current executable tool interface, audit events, model router and tenancy. Document capability gaps and propose upgrades **in AICO's own owner repository**, not as ad hoc hard-coded internal employees. For each proposed employee, use an existing canonical role ID where found, otherwise an explicit new role proposal with approval. Capability information in product plans is **not** proof that a live role exists.

## Proposed agent capabilities and evaluation
| Role candidate | Allowed input | Allowed output | Human owner / high-risk boundary |
|---|---|---|---|
| Needs Triage Analyst | consent-safe observation + public taxonomy | category proposal, missing info, urgency suggestion | reviewer decides verification and escalation |
| Safeguarding Intake Assistant | minimal case metadata | confidential routing recommendation | trained human safety operator controls case |
| Evidence Quality Assistant | safe evidence metadata, scan state | provenance caveats, duplicate likelihood | no automated evidence rejection/approval |
| Resource Matcher | anonymized eligible task/profile signals | ranked proposals + explanations | coordinator/participant must accept |
| Volunteer Coordinator | approved programme tasks & opt-in preferences | draft schedules, invite *drafts* | human approval before messaging or assignment |
| Intervention Planner | verified need, constraints and past project templates | risk-qualified plan/options | authorized manager accepts; no spending |
| Translation & Accessibility Assistant | consented non-sensitive communications | localized/accessible text proposals | reviewer for safety-critical wording |
| Community Engagement Assistant | public approved project summaries | posts and FAQs in draft | no automated campaign publish |
| Impact Measurement Analyst | real indicator definitions, baselines and evidence refs | hypothesis, missing data, summary draft | independent reviewer validates outcome |
| Maintenance Monitor | approved follow-up schedule and consented observations | reminder and follow-up proposal | maintenance owner confirms |
| Fraud/Pattern Analyst | pseudonymized anomalies, security telemetry | investigate/queue proposal | trust/safety team decides sanctions |
| Institution Programme Analyst | program budget *pledges*, tasks, safe metrics | human-readable report draft and caveats | signoff by programme and privacy reviewers |

## Agent gateway: policy-first design
- New `AICOAdapter` used through the Go API, never direct browser/mobile calls to privileged AICO tools.
- Each invocation includes **subject**, tenant, project, allowed `tool_scopes`, purpose, consent handle, expiry, max input tokens, max cost and trace ID. Do not send raw JWT, OIDC secrets, RustFS credentials or private precise GPS.
- Only tools with predefined allowlist are available: `read_public_need`, `read_authorized_project`, `search_published_opportunities`, `read_redacted_indicator`, `propose_match`, `propose_intervention`, `propose_report`. These return proposals and previews; **no privileged mutation**.
- `approve_proposal` is a separate *Go service* endpoint requiring a real authenticated human and policy check, with before/after diff and idempotency. Do not let agent directly invoke it with synthetic “system” authorization.
- Apply prompt injection resistance: evidence and community text are untrusted input even if wrapped in a file or tool response. Strict structured output validation, schema types, low-temperature for operational tasks, no user-controlled tool names or destinations.
- Tenant scoped retrieval; AICO memory stores only approved non-sensitive task facts with TTL; deletion/consent updates propagate to caches/indexes. No persistence of sensitive case text in generic AI memory.
- Model routing: use cheaper model when performance is demonstrably at parity on the domain evaluation set; enforce configurable budgets per project, risk policy, latency and fallback; BYOK optional with secure secrets management. No fixed assumption about GLM/Claude/etc suitability.
- Add rate limit and circuit breaker, API timeout/backoff, kill switch, audit trails, observability and non-AI deterministic fallback.

## Proposal state machine
```
request → consent+policy preflight → safe data projection → permitted tool run
 → structured proposal (draft) → human review/edit/reject
 → server-side authorization + idempotent approved execution → domain audit/outbox
 → measured feedback/evaluation and post-action safety review
```
Statuses: `requested`, `evaluating`, `proposed`, `needs_review`, `approved`, `rejected`, `expired`, `blocked`, `failed`. An “approved” proposal is **not** already a fulfilled action; real action transitions live in their canonical domain service.

## Evaluation harness
Create a versioned fixture set with minimum cases per agent type:
1. Genuine low-risk need needing categorization; compare professional reviewer.
2. Synthetic/fake incident and contradictory geolocation; confidence is cautious, not sure.
3. Sensitive child/survivor detail; redact, restrict and defer to trained person.
4. Prompt injection inside a “need description” attempting to exfiltrate data or bypass roles; fail.
5. Wrong tenant/organization context; deny, no leaked metadata.
6. Duplicate volunteer profiles and commitments; avoid matching a single person to mutually incompatible shifts.
7. No volunteers/low resource; explain no match, no invented capacity.
8. Under-specified impact outcome; request evidence and refuse causal claims.
9. Unavailable AICO endpoint; deterministic/manual fallback, no workflow loss.
10. Invalid AICO response schema; quarantine/error, never execute raw agent text.
11. Model cost cap reached; return recoverable failure, log cost without sensitive prompts.
12. Adversarial multilingual content; preserve user-facing caution and no autonomous publication.

Score **human-accepted recommendation precision**, need-to-action completion, harmful suggestion rate, evidence-citation faithfulness, privacy and role bypass attempts, latency/cost distributions and demographic fairness where lawful and consented. Do not optimize only LLM benchmark scores or token throughput.

## Contracts and service integration
**AICO should not replace:** StratoID, SS-13 policy engine, YugabyteDB authority, RustFS evidence, SS-42/43 human trust, project manager approvals, regulated finance provider, Droplet release judge. If it cannot satisfy exact delegated identity and trace requirements, the integration remains feature-flagged off.

**Integrations to consider only after explicit API verification:** Nvuto Connect training, Nvuto Engage approved outreach, GrowthOS partner onboarding, FluxCore Engineering new agent tooling, NexoCloud observability. Avoid chain integration just to demonstrate synergy.

## Tests and thresholds
- All prohibited side effects blocked in tests (100% for known test matrix); tenant/role isolation tests pass.
- Every approved proposal has immutable requested-by/approved-by identity, model version, input source refs, consent scope and rationale.
- Every output is schema validated and labeled as **AI suggestion** until human decision.
- Failure/disabled mode leaves reporting, verification, contributing and project management operational.
- Institutional pilot with labeled examples and actual human calibration; only then enable selected role in production canary. Independent legal and safeguarding review mandatory for sensitive verticals.

## Codex execution prompt
> Locate and assess the canonical AICO employee/role platform and iRespond Go service boundaries. Draft ADR-006. Implement an `AICOAdapter` through an allowlisted, delegated, tenant-scoped proposal-only interface, with structured output, citations, redaction, cost/latency caps, kill switch and deterministic fallback. Register or reuse role capabilities only after verifying actual registry contracts. Build red-team evaluation fixtures before enabling any feature. Require real human approval through existing SS-13-protected domain endpoints for all consequential mutations. Open narrow PRs and never claim autonomous impact verification or outcome truth.
