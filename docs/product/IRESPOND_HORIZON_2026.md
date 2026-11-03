# iRespond Horizon 2026 — product and engineering evolution

**Status:** Implementation initiated on `feat/impact-experience-evolution-20261101`.
**Baseline:** `Atlasfsp/iRespond`, October 10 main `c12a4b5`.
**Owner:** Product, frontend, Trust & Safety, platform engineering.
**Policy:** No direct changes to `main`; no GA designation without independent evidence.

## Product north star

**See the need. Mobilize the ability. Solve the problem. Verify the impact. Sustain the change.**

iRespond is an AI-assisted global community-action network—not merely a donation app or a social feed. The sustainable differentiation is its complete, community-owned need → response → evidence → outcome → maintenance loop.

### External signals (source links and contextual timing)

- UN International Year of Volunteers for Sustainable Development, 2026: https://www.unv.org/ivy2026
- UNV GIVE volunteer-engagement measurement research, August 2026: https://www.unv.org/
- Benevity corporate volunteering and AI-enhanced corporate-impact product updates: https://benevity.com/
- GoFundMe October 2026 supporter-led fundraising research: https://www.gofundme.com/
- Global safety/accessibility/privacy developments: https://digital-strategy.ec.europa.eu/en/policies/digital-services-act ; https://www.ofcom.org.uk/online-safety/
- Design references (inspiration only, no reproduction): https://www.behance.net/gallery/252753177/COMON-Case-Study-App-UXUI-Design ; https://www.behance.net/gallery/245594757/VoluNear-Volunteering-Mobile-App-UIUX-Case-Study ; https://www.behance.net/gallery/248432207/Donation-Mobile-App-UX-UI-Case-Study ; https://dribbble.com/shots/26805406-Community-Impact-Contribution-App-UI ; https://dribbble.com/shots/18020682-Crisis-CleanUp-Dashboard-Mobile

Use source research as directional evidence. Do not present competitor metrics as iRespond adoption or revenue forecasts.

## Current implementation slice

1. Responsive browser `apps/web/horizon.css`: editorial type scale, deep navy/mint/amber palette, accessible focus, responsive action cards, status-conscious journeys.
2. Browser `renderHome`: no fake impact KPIs, all actions navigate to existing real routes, role permissions stay server-owned.
3. Mobile `apps/mobile/app/index.tsx`: premium, responsive discover/report/workspace/passport action flow; offline queued reports remain visible and recoverable.
4. Mobile `NeedMap`: live API results, client-side text/status filters, no fabricated map coordinates or pseudo-geographic pins.
5. Shared mobile navigation chrome: clearer active tab and accessible 44+ point action targets.

**This slice does not claim to deliver an AI worker, payments, C2PA validation, native map provider, or institutional ImpactOS backends.** Those require the explicitly scoped contracts and gates below.

## Six product editions on a shared domain foundation

| Edition | Initial customer | First viable capability | Dependencies |
|---|---|---|---|
| Community | Individuals and neighborhood groups | Report, discover, respond, verify, sustain | Current mobile/web/backend |
| ImpactOS | NGOs, foundations, CSR institutions | Governed programme workspaces, assignments and evidence reports | Institution and tenant contracts |
| Volunteer & Skills Cloud | NGOs, universities and employers | Consent-based skills/availability matching | Ability profiles, policy-safe matching |
| Action Intelligence | Coordinators and operators | Human-approved AI need triage and task suggestions | AICO agent runtime, audit |
| Trust & Impact Registry | Auditors, funders, civil society | Signed review outcomes and verifiable evidence provenance | SS-42 media safety, retention and review |
| Resilience | Humanitarian partners and local governments | Incident-to-response coordination | Strong location protection, escalation and emergency safety |

Begin with verticalized packages rather than proliferating isolated applications. Reuse the canonical API, security and data services.

## User journeys and design rules

### Community participant

- Landing home opens quickly and offers **Discover**, **Report**, **Take Action** and **My Impact**.
- A user can report an observation with confirmed intervention coordinates, evidence and SDG association.
- The report clearly remains unverified until a trusted review concludes.
- Offline reports persist with explicit sync/review status; never silently delete or duplicate them.
- A participant can accept a project invitation or contribute time, skills or resources through the existing governed route.
- Impact Passport displays server-evidenced claims separately from locally declared profile information.
- Do not fabricate nearby-needs counts, financial transfers, fake action feeds or impact scores.

### Institutional coordinator (phased capability)

- Institution-specific tenant boundary and project context.
- Programme design, volunteer tasks, risk-aware planning, evidence checklists and review assignments.
- A human-reviewed programme outcome report: outputs, outcomes, uncertainty, beneficiary voice and maintenance evidence.
- Organization reporting must not expose personal details or precisely geolocated vulnerable people.
- Every write derives access from StratoID/SS-13 and server-returned project permissions.

### Cross-cutting quality

- Operable on small phones, dynamic type, assistive technology and reduced motion.
- WCAG 2.2 AA target for the browser; VoiceOver/TalkBack and genuine device checks for native.
- Body text large enough for readability; 44+ CSS pixel/device-point targets for touch actions where possible.
- Loading, empty, error, denied, offline and stale-state screens are explicitly designed.
- Perceived performance is measured rather than inferred from mockups.
- Trusted records must not be conveyed solely by icon/color without a text label.

## Contracts to design and implement next

### A. Evidence integrity and verification

- Evidence object: immutable original object reference, content hash, capture metadata policy, consent context and chain of review.
- Provenance: optional Content Credentials/C2PA validation and independent checks; absence of credentials != false evidence.
- Moderation: malware/format screening, sensitive content quarantine, escalation and deletion propagation.
- State labels: `observed`, `verification_requested`, `community_confirmed`, `institution_confirmed`, `expert_confirmed`, `independently_audited`, `government_confirmed`, `disputed`, `rejected` as allowed by canonical backend schema.
- Risk scoring is advisory; no unreviewed automated rejection or institutional accusations.
- Exact separation of evidence upload, evidence approval and independent impact evaluation.

### B. Impact Intelligence

Design record families: `intervention_goal`, `baseline_observation`, `output_evidence`, `outcome_measurement`, `beneficiary_feedback`, `maintenance_review`, `attribution_note`, `review_attestation`.

- Show evidence grade and missing data, not a guessed universal impact score.
- Map to SDGs and **conceptual** GIVE dimensions (individual, community, economic and enabling environment) with explicit measurement provenance.
- Never imply formal UN accreditation, validated causality or social return on investment without independent methodology.
- Human reviewers approve publication; affected community can challenge claims.

### C. AICO/Action Intelligence

Candidate AI employee capabilities: Needs Triage Analyst, Resource Matcher, Volunteer Coordinator, Intervention Planner, Accessibility Assistant, Multilingual Outreach Assistant, Impact Measurement Analyst, Evidence Quality Assistant, Safeguarding Triage Assistant, Maintenance Monitor.

- Outputs are proposals, confidence-qualified and traceable to actual evidence.
- Agents read the least data possible through delegated, tenant-scoped permissions.
- Tools are explicitly allowlisted; changes to roles, safety outcomes, eligibility, resources or spending need human authorization.
- Add cost/latency caps, observability, prompt-injection filtering and runtime shutdown controls.
- No autonomous real-money movement.

### D. Trustworthy finance

Initial GA is **pledge only**. A pledge cannot be displayed as charged, received, reserved or settled money.

Future payment handling requires separate country/provider and charity-eligibility review, receipting, payout states, reversals, chargebacks and reconciliation. Do not start regulated payment flows in this frontend patch.

### E. Institution and corporate engagement

- Define institution tenant contracts before rendering an organization admin dashboard as functional.
- Define programme, activity, skills, participant and verification schemas with privacy minimization.
- Integration candidates: Nvuto workflows/Engage/Connect, StratoID, Shared Services, GrowthOS, AICO, NexoCloud.
- Activate only explicit contracts with auditable authorization, available services and successful production tests.

## Incremental release sequence

### Slice 0 — now, presentation and truthful discovery
- [x] Web community-action landing and new visual hierarchy
- [x] Mobile discovery/report/action/passport landing
- [x] Mobile verification-state filters against actual nearby results
- [x] Browser and mobile semantics preserving existing APIs and permissions
- [ ] Browser/mobile visual regression, screen-reader and device matrix
- [ ] Living-manual screenshot sync after candidate freeze is lifted

### Slice 1 — AI-assist and impact data modelling
- [ ] Draft schema/ADR for outcome measurements and evidence provenance
- [ ] Human-supervised matching prototype with opt-in Ability Profile and privacy gates
- [ ] Programme reporting MVP built from verified API records
- [ ] Reviewer queue and adversarial fraud/AI-generated-media test cases
- [ ] Benchmarks: report completion, match relevance, time to response, validated outcome coverage

### Slice 2 — institutional pilots
- [ ] Tenant-isolated institutional onboarding, organisation membership and permissions
- [ ] CSR/NGO programme template and administrator journeys
- [ ] Integrations with Nvuto workflows and institutional communication
- [ ] Pilot one tightly scoped community programme with outcome and maintenance review
- [ ] Conduct consent, accessibility and independent security audit

### Slice 3 — expand only with evidence
- [ ] Country-specific policy configuration and crisis escalation
- [ ] Content provenance ingestion where source permits
- [ ] Limited open-impact attestations and controlled exports
- [ ] Multi-programme institution dashboards and repeat-programme measurement
- [ ] Public community activation campaigns with anti-fraud controls

## GA gates, acceptance and non-negotiables

Keep current `main` unchanged until this PR is reviewed. Review the external GA tracker at https://github.com/Atlasfsp/iRespond/issues/53 and exact SHA evidence. Existing baseline has already moved beyond the original frozen commit, so recertify any proposed new candidate.

Before merge: full syntax/TypeScript, `tools/verify_web_frontend.mjs`, API-coverage/execution/route/authorization tests, responsive screen captures, offline recovery and accessibility test evidence.

Before production: real AppForge signing/distribution; SkyForge live/canary/rollback; StratoID/Shared Services; YugabyteDB/RustFS; SS-42 media safety; real devices/accessibility; legal/privacy/safeguarding; independent security and operational owners.

**Do not call this product GA-ready based on frontend-only tests.**

## Initial success metrics (measure; never populate with fictional data)

1. Valid observation submission rate and percent requiring coordinate correction.
2. Discovery → report/contribution intent → completed verified action conversion.
3. Time to first verified response and community resolution rate.
4. Contribution fulfilment, abandonment and coordination burden.
5. Evidence approval and appeal resolution quality.
6. Outcome measurement completeness and six-month maintenance status.
7. Accessibility task completion; offline queue recoverability and error rate.
8. Institutional pilot retention and willingness to pay.

All metrics must include a denominator, time period, evidence source and missing-data designation.
