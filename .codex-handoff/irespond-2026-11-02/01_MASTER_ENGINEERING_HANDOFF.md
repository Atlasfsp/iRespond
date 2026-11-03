# iRespond — Autonomous Codex Engineering Handoff
**Programme:** Community Action Network → verified impact infrastructure  
**Baseline intelligence:** November 2, 2026 · Africa/Lagos  
**Audience:** Codex, engineering owner, release manager, privacy/safeguarding reviewers, product leadership  
**Mode:** Autonomous execution in auditable short-lived branches; gated promotion; never silent GA declaration

## Executive mandate
Build the next generation of **iRespond** without breaking the product that already exists. iRespond's differentiator is not crowdfunding or generic volunteering; it is the **complete, accountable community-action chain**: *see → report → verify → diagnose → plan → mobilize → act → measure → maintain → replicate*. Support individuals, community groups, NGOs, institutional foundations, universities and corporate CSR teams within one governed platform. Let **AICO** augment responsible human participants through explainable suggestions, translation, triage, coordination and impact analysis. Avoid fictional projects, inflated outcomes, automatic approvals, unlicensed payment activity and data disclosure.

**Canonical product doctrine:** “See it. Own it. Solve it. Prove the impact.” Response to Ability; 3P Action Compass (Place, Position, Possessions/Capabilities); community ownership; opt-in contribution; participant safeguarding; transparent evidence and sustained outcomes.

### Immutable repository/candidate facts — re-check before editing
| Item | Verified on 2026-11-02 | Treatment |
|---|---|---|
| Canonical repository | `Atlasfsp/iRespond` | Use the existing local repository; do not clone another copy. |
| `main` at retrieval | `c12a4b5b8736700c2fdf2739fcd6f9a41c233521` | Do not change directly; refresh from GitHub. |
| Frozen certification snapshot | `6484873c8a0c3306a5972247bcc9981da4051bc6` | Historical exact-SHA evidence; preserve unchanged. |
| Accepted frozen run | `32952095093` | Previously completed repository certification, **not** proof that new code is certified. |
| Frozen evidence artifact ID | `9600540959` | Archive; check SHA-256 `bddbebbeee35ec08cfb4ed71fa0e9505a43e69d7a9ad7c8d53a200fcb3d57f22`. |
| Frozen release decision | `READY_FOR_EXTERNAL_CERTIFICATION`, `ga=false` | Keep external gates pending. |
| Integrated UI PR | `#71` Horizon + FIELDWORK V2, head `e1d9cb524164aa0e1c8fdaf0eb878c49dac80536` at retrieval | One open PR, mergeable without code conflict, blocked by GitHub required checks. |
| FIELDWORK sub-PR | `#75` | Already merged **into PR #71's branch**, not into `main`. |
| Industry engineering issues | `#72` impact, `#73` AICO/matching, `#74` ImpactOS, `#76` dependency security | Build on these; avoid duplicates. |
| GA external tracker | `#53` | Remains open; immutable evidence policy. |

**Important distinction:** The historical candidate SHA is **not** current `main`. Do not label `c12a4b5` or PR #71 as the frozen candidate, and do not reuse the 6484873c evidence for a different tree. After source advances, create and validate a *new* candidate while keeping the historical artifact readable and attributable.

## Authoritative read order (do this before generating any code)
1. `git status --short`, remotes, default branch, latest heads and PR metadata. Preserve user's uncommitted work; stop destructive operations. Use only the existing iRespond folder, discover it rather than assuming a path.
2. `README.md`, `docs/GA_READINESS.md`, `docs/GA_EXTERNAL_CERTIFICATION_HANDOFF.md`, `config/ga/external-gates.json`, `services/api/openapi.yaml`, migration README, `services/api/internal/**`, `apps/web/**`, `apps/mobile/**`.
3. Draft feature sources from PR #71: `docs/product/IRESPOND_HORIZON_2026.md`, `docs/contracts/impact-outcome.v1.proposal.schema.json`, `docs/design/FIELDWORK_DESIGN_SYSTEM_V2.md`, `apps/web/fieldwork.css`, `apps/mobile/lib/fieldwork-theme.ts`, screenshots under `docs/screenshots/`.
4. `.github/workflows/{verify,web-verify,build-android-demo,docs-baseline-ownership,docs-interface-sync,living-manuals}.yml`, CI pinning and documentation baseline guards.
5. GitHub issues #53–#64, #71–#76, plus external AppForge `Atlasfsp/NexoCloud_AppForge#51`, SkyForge `Atlasfsp/NexoCloud-SkyForge#24`, Droplet `abiolaogu/Droplet#10`. These are *discovery references*, not authority to mutate external repositories automatically.
6. Read actual AICO/Nvuto/Shared Services contracts and current SDKs. Never guess AICO endpoints, assumed roles already registered, authorization keys, data schemas or provider capability.

## Hard invariants
- **Preserve the existing freeze:** no direct push to `main`; no overwrite/re-tag of frozen evidence; no false `ga=true`.
- **Canonical data/stack:** YugabyteDB **YSQL** as relational source of truth; **RustFS** through AWS S3-compatible SDK for immutable evidence bytes; Go services; React/JavaScript browser client; Expo Router/React Native mobile client; `pnpm@10.15.0`; Go `1.26.9` pinned in workflows; existing TypeScript/mobile dependency versions unless a tested migration is approved; event delivery via existing transactional outbox and SS-03 NATS/Redpanda when available.
- **Shared service responsibilities:** StratoID/OIDC and PKCE; SS-13 fail-closed authorization; SS-44 for enhanced geospatial; SS-18 notification intents; SS-24 privacy/data rights; SS-42 media-safety; SS-43 trust/safeguarding. Integrate with tenant-scoped workload identity; keep standalone fallback only where deliberately modeled.
- **Money:** initial candidate is **pledge-only**. A pledged amount is never payment, charge, settled receipt, held escrow or disbursement. Licensed PayCore/payment provider work is a separate regulated project and separate release scope.
- **Data and evidence:** distinct `observed`, `verification_requested`, privileged confirmation variants, `disputed`, `rejected`. Keep original verified uploaded bytes write-once; SHA-256 readback and moderation before authorized access. C2PA is an optional provenance signal; never equate metadata with factual truth.
- **Community protections:** affected-person consent; minors/vulnerable users; explicit crisis/harassment routes; safe coarse locations; prevent doxxing; never use AI to automatically approve evidence, publish accusations, reject beneficiaries or execute money movement.
- **Institutional security:** tenant boundary enforced in server and YSQL query predicates; global role alone grants no project resource authorization. Support denial/404 and document-level permissions.
- **GA and CI:** no bypass of protected-branch statuses; no fabricated CI green or fake screenshots; no `DO_NOT_SHIP` override; real AppForge/SkyForge/Droplet evidence required for external certification.
- **IP, licensing and UX:** FIELDWORK/Stitch are the current visual baseline. Use original licensed visuals; no copying Dribbble/Behance assets; accessible WCAG 2.2 AA aspirational browser requirement and actual mobile assistive tech tests; no speculative KPIs.
- **Operational safety:** use feature flags and migrations that allow safe rolling deployments; no irreversible schema break or data loss; observability must exclude secrets/PII.

## Workstream architecture and priorities

### P0 — source control, CI, release/candidate integrity
**Objective:** merge the integrated UI safely, eliminate dependency security regressions and reproduce the permanent CI jobs without buying GitHub-hosted minutes. MacBook Linux VM self-hosted runner must be isolated for public repo risk; verify whether GitHub Actions billing restrictions prevent even self-hosted jobs. Preserve build evidence and required status contexts. See `02_GA_AND_RELEASE_ENGINEERING.md`.

### P1 — Trust, Evidence and Safeguarding platform
Add provenance and evidence-review metadata *alongside* the existing evidence records; keep originals immutable; review/appeal and quarantine workflows; privacy redaction across exports and share links. C2PA optional and **not a truth oracle**. Threats include forged locations, synthetic humanitarian images, brigading, identity impersonation, abuse, duplicate project claims and collusive review. See `04_TRUST_EVIDENCE_AND_SAFEGUARDING.md`.

### P1 — Measured Impact Intelligence
Build durable baselines, output/outcome measurements, data provenance, reviewer attestations, beneficiary voice and post-project maintenance. Separate **reported activity**, **verified outputs**, **measured outcomes** and **causality claims**. Reuse Impact Passport as a summary of real source records. SDG mapping and UNV GIVE four dimensions are **conceptual analytical frameworks** until independently validated. See `05_IMPACTOS_AND_IMPACT_INTELLIGENCE.md`.

### P1/P2 — Volunteer & Skills Cloud
Extend Response-to-Ability with consented skills, availability, capacity, commitments and safeguarding checks. Start with deterministic and human-reviewed matching; later optional AICO reranking. No autonomous or mandatory behavioral profiling; transparent matching explanations and equitable access. See `06_VOLUNTEER_MATCHING.md`.

### P2 — AICO Action Intelligence
Use existing AICO role/employee capability registry where available, without creating a disconnected new AI employee silo. Introduce side-effect-free propose/evaluate flows, resource-scoped tools, audit, cost caps and human approvals. Model-provider routing follows validated quality/cost parity and BYOK policy. Failure degrades to rule-based/manual flows. See `07_AICO_INTEGRATION.md`.

### P2 — Institutional ImpactOS
B2B multi-tenant programmes: NGO/foundation/CSR/university portfolios, governed project rooms, approved invitations, contributor tasks, evidence reviews, measured outcome reports and maintenance dashboards. Begin with a *pilot*; don't ship complex institutional capabilities to the public UI without server contracts and permissions. See `05_IMPACTOS_AND_IMPACT_INTELLIGENCE.md`.

### P3 — Resilience and public expansion
High-risk emergency response needs crisis-specific partners, elevated safeguarding, location shielding, abuse prevention and relevant jurisdictional procedures. Keep public emergency escalation **out of MVP** until owner and drills exist. Optional public attestations, partner APIs and credential interoperability follow real demand, not demo enthusiasm.

## Non-negotiable execution sequence for Codex
**Step 0 — Discover.** Use `pwd`, `find`/`git`, `gh repo view`, `gh pr view`, branch and worktree checks. Write `build/handoff/baseline.json` from actual CLI commands. Stop if canonical repo identity doesn't match. Never discard local changes or blindly clone.

**Step 1 — Classify release tracks.** Track A = historical external certification for the frozen SHA; Track B = next candidate for post-PR-71 and new product slices. Draw a provenance graph: source SHA, tree SHA, image digest, Helm chart hash, artifact checksums, acceptance workflow ID, human decision. Never relabel Track A with Track B evidence.

**Step 2 — Reproduce CI locally.** Run offline/unit/static tests and production-like integration in an isolated Ubuntu VM with real YugabyteDB and RustFS; log evidence and toolchain versions. Do *not* change protected-branch settings to bypass failures. If GitHub self-hosted workflow scheduling is blocked by account billing, write a precise external blocker. Distinguish local PASS from GitHub required-check PASS.

**Step 3 — Resolve dependency findings.** Issue #76: validate `pnpm` config behavior; move supported overrides/patch config to `pnpm-workspace.yaml` where appropriate; regenerate lock deterministically; fix high vulnerabilities; preserve the Metro patch; exercise web, Expo/Metro, iOS/Android build where possible. Never suppress a security issue just to pass audit.

**Step 4 — Complete merged UI.** Ensure PR #71 includes FIELDWORK from PR #75; verify 91 design contracts; preserve genuine API-backed routes (45 user-facing operations), offline reports, NeedMap filters and Impact Passport. Test error/empty/offline/denied states, touch and keyboard/accessibility. Capture true desktop/browser, Expo web and real-device images with exact source SHA and method.

**Step 5 — Merge when allowed.** Fetch current PR head; compare/resolve conflicts; run all gates at exact head/merge result. Only normal GitHub merge with expected SHA after required statuses green, reviews satisfied. No administrator bypass. On merge, check new main tree/commit and immediately create a new candidate ledger. If blocked, don't claim merged.

**Step 6 — Deliver additive domain slices.** In narrow PRs: `impact-model` + migrations; `evidence-provenance`; `volunteer-profile-and-consent`; `deterministic-match`; `aico-proposals`; `institution-programmes`; `impact-reports`. Every PR adds OpenAPI, YSQL migrations, policy tests, E2E tests, docs, flags, rollback and measurable acceptance criteria.

**Step 7 — Run 90-day plan.** Use exact weeks/dependencies and go/no-go gates in `08_90_DAY_EXECUTION_PLAN.md`. Report daily useful engineering deltas, not fictional progress. Milestone quality overrides scope and dates.

## Required outputs from Codex
1. `build/handoff/repo-inventory.md` / machine-readable baseline (all commit refs real).
2. `docs/adr/` with decisions on identity, institution tenant model, evidence provenance, impact measurement, matching, AI delegation, finance pledge boundary and release control.
3. Updated API OpenAPI, request/response examples, generated contract smoke tests, DB migrations with downgrade/roll-forward plan.
4. Go domain modules + mobile/web screens + platform adapters + flags; all with tests.
5. Signed or hash-bound build/test provenance and PR links; CI runner evidence; artifacts not committed if secret/private.
6. `docs/ga/release-readiness.md` distinguishing automated, independent and launch approvals.
7. Screenshots from actual executable clients with SHA, device/viewport, sample data disclosure, dates and accessibility notes.
8. `docs/metrics/impact-kpis.md` containing definitions, denominators, observation windows and unknown-data handling; **no fabricated baselines**.
9. Pilot operation runbook with escalation, incident/abuse channels, privacy request SLAs where legally reviewed, on-call and community feedback.
10. `build/handoff/final-report.md`: completed/partial/not started, blockers, owner, next command, URLs and exact SHAs.

## Autonomy boundaries
Codex may author, test, open PRs and perform safe internal development. External legal, safeguarding, security, store, financial and institutional approvals must be obtained from actual responsible humans. Codex must **not** create fake approvals, invent acceptance evidence, force changes to personal Mac files, open an exposed public runner, manipulate branch-protection check statuses, or enable paid GitHub Actions without explicit user authorization.

## Definition of success
The initial UI PR is merged only when GitHub's **real** required check contexts have passed. The 90-day programme then yields a verified pilot-ready multi-tenant, evidence-aware and AI-assisted platform in a **new candidate** with real QA; GA remains **NO-GO** until independently certified, regardless of code completeness. Preserve `ga=false` until all relevant external gates are documented and approved.

### Reference index
- UN International Year of Volunteers 2026: https://www.unv.org/ivy2026
- 2026 State of the World's Volunteerism Report / GIVE: https://www.unv.org/sites/default/files/The%202026%20SWVR%20Web%20Version.pdf
- C2PA content credentials 2.2: https://spec.c2pa.org/specifications/specifications/2.2/specs/ContentCredentials.html
- C2PA explainer: https://spec.c2pa.org/specifications/specifications/2.2/explainer/_attachments/Explainer.pdf
- GitHub self-hosted runner security: https://docs.github.com/en/actions/reference/security/secure-use
- GitHub runner registration: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners
- OWASP AI security: https://genai.owasp.org/
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/

> These industry signals inform product hypotheses and safeguards; they are not adoption, financial return or compliance certification evidence for iRespond.
