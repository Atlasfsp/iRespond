# Capacity-aware implementation and decision register

As of 2026-11-02. The supplied 90-day programme is a relative dependency framework,
not an approved calendar or proof of completed field work. AI-assisted execution
is available in this repository; committed human capacity is UNKNOWN.

## Evidence-backed deliverables

| Deliverable | Source / evidence | Remaining dependency |
| --- | --- | --- |
| FIELDWORK web/mobile baseline | PR #71, e90b95b3ed371b5b9774e83a04aa0982fe619f86; genuine web, mobile, API, security and deployment jobs | Protected merge; additional screen/state, device and accessibility validation |
| Independent evidence review, immutable source and audit/outbox transaction | PR #78, 1ab0f209914974782fbb4bd6b2cfd74ae7133693; Linux Go race tests with YugabyteDB/RustFS | Review, resource/tenant authorization and production integration |
| Fail-closed SS13 authorization adapter | PR #79, a7cc333d6f5bfe5b4c8fe0760f715ae0e2895c0b; malformed response, redirect and revocation regression tests | Route-level policy wiring and live service approval |
| Complete supplied engineering package | PR #77, 6fa4e0b5627fb5419b8818d8033f2a499a143b0d; verified package hashes | Most new product-domain acceptance requirements remain unverified |

## Engineering estimates and dependencies

Effort is a preliminary range of focused engineer-days, not a staffing commitment
or elapsed-time forecast. Re-estimate each slice after tests and integration discovery.
Review, coordination and external certification lead times are additional.

| Ordered work | Estimated effort | Dependencies / exit evidence |
| --- | --- | --- |
| FIELDWORK web/mobile flows and accessibility | 8–20 | Real browser/native regression checks, error/offline states, assistive-tech review |
| Existing API integration and release blockers | 5–12 | Contract/authorization tests; organization artifact quota; protected checks |
| Trust, tenant boundaries and evidence controls | 10–25 | Verified identity, SS13 policies, YSQL/RustFS negative tests |
| Measured outcomes and feedback | 12–25 | Provenance, methodology/versioning, consent, safe projections |
| Volunteer profiles and matching | 10–22 | Revocable consent, authorization, concurrent application tests |
| AICO proposal workflows | 8–18 | Pinned canonical registry/contracts; human approval and fail-closed tool boundaries |
| Institutional ImpactOS and pilot readiness | 15–30 | Tenant membership, invitations, programme/report isolation, operating runbooks |
| Hardening and certification preparation | 10–20 | Full acceptance matrix, independent reviews and verifiable external receipts |

Hypothetical scenarios below are planning arithmetic only. No person or allocation
has been committed. They do not promise delivery in 90 calendar days.

| Scenario | Hypothetical capacity | Planning consequence |
| --- | --- | --- |
| Constrained | 0.5 human FTE | Prioritize one small reviewed slice at a time; external review may dominate elapsed time |
| Baseline | 2 human FTE | Permit UI and service implementation in parallel after contracts stabilize |
| Accelerated | 4 human FTE | Parallel verification and domain work, constrained by review and shared dependencies |

## Decision register

All assignments below are UNASSIGNED; role descriptions are required responsibilities,
not appointments. UNKNOWN means no supported commitment exists.

| ID | Decision / dependency | Required accountable role | Status / evidence |
| --- | --- | --- | --- |
| D01 | Human headcount, FTE, weekly hours and review capacity | Engineering sponsor | UNKNOWN / user confirms no committed allocation |
| D02 | Institution and sector selection | Pilot sponsor | UNCONFIRMED / no partnership approved |
| D03 | Named institutional owner and coordinator | Institutional sponsor | UNASSIGNED |
| D04 | Participant/cohort size and deployment volume | Pilot owner | UNKNOWN / no validated cohort |
| D05 | Commencement, testing and launch dates | Pilot owner and release authority | UNAPPROVED |
| D06 | Consent, safeguarding, escalation and training owners | Data protection and safeguarding leads | UNASSIGNED / independent approval required |
| D07 | Outcome methodology and beneficiary feedback protocol | Measurement lead | PROPOSED / no field validation |
| D08 | Artifact quota and protected merge checks | GitHub organization administrator | BLOCKED / required uploads hit storage quota |
| D09 | Independent security, legal and operational certification | Canonical external gate owners | PENDING / ga=false |
| D10 | Commercial terms and support obligations | Authorized institutional/commercial owners | UNAPPROVED / no willingness-to-pay evidence |

Update decisions only with a dated verifiable receipt and actual accountable owner.
Repository-controlled work continues while D01–D07 remain unresolved. No institution,
spend, staffing or real pilot deployment is authorized by these templates.
