# Codex Prompt Pack — execute sequentially from existing iRespond repo

> **Using these prompts:** Run Codex in the existing local iRespond repository. First instruct Codex to read `00_START_HERE.md` and all domain packs. Each prompt is self-contained enough for a new Codex session but builds on prior documented artefacts. Do not clone, reset, delete or overwrite the user's work. Work through real PRs and tests. “Continue autonomously” means continue *within actual access and safety constraints*; do not promise asynchronous completion.

## PROMPT 0 — Discovery and exact source inventory
```text
You are the principal engineer for Atlasfsp/iRespond. Read all files under the supplied CODEX_HANDOFF directory before coding, especially 01_MASTER_ENGINEERING_HANDOFF.md and 02_GA_AND_RELEASE_ENGINEERING.md. Identify the existing local iRespond Git working directory; DO NOT clone another copy. Inspect pwd, git remote -v, status, worktrees, main SHA, GitHub PR #71, issues #53, #72–#74, #76, and every canonical release document. Refresh facts from GitHub; treat handoff SHAs as as-of-2026-11-02 references, not assumptions about present state. Respect uncommitted local changes. Map actual service, UI, policy, database, CI and documentation owners. Produce build/handoff/repo-inventory.md, machine-readable baseline.json and a risk-ranked gap register, with exact commands and references. Do not mutate main or historic candidate. Present a short source-of-truth table and proceed to Prompt 1 only if repository identity matches.
```

## PROMPT 1 — Release-branch governance and MacBook runner
```text
Use the verified iRespond repo and the user's instruction: DO NOT incur paid GitHub Actions charges. Build a secure isolated Ubuntu Linux VM on the MacBook only with owner-approved provisioning. Check whether this public repo and its GitHub Actions billing restriction allow a self-hosted runner; first run a restricted, disposable, trusted smoke job. Do not expose personal Mac data, production secrets, Docker host socket or public-fork PR code. Use exact pinned workflow dependencies, official GitHub runner, short-lived registration token and restricted labels. Rework only the necessary jobs, preserving job IDs and all required checks (mobile, security-boundary, supply-chain, api, deployment, web-contract, plus applicable documentation gates). Preserve the base-controlled pull_request_target baseline ownership guard. If GitHub will not schedule self-hosted jobs, stop at that external blocker; DO NOT fabricate success statuses or bypass branch protection. Produce setup, hardening, rollback, teardown and documented runner health evidence. Track any new CI branch separately.
```

## PROMPT 2 — Dependency and supply-chain remediation (#76)
```text
Audit the exact repository with pnpm 10.15.0. The previous production lockfile had high-severity transitive advisories and used pnpm fields ignored by the current package manager. Reproduce advisories from fresh registry data, then migrate supported overrides/patch config to its canonical location and produce a reviewed deterministic lockfile refresh. Preserve metro@0.82.5.patch and Expo Router compatibility. Fix undici/decode-uri-component/node-forge/minimatch/glob only with validated compatible versions; do not force major version updates silently. Run frozen install, pnpm audit --prod --audit-level high, Expo dependency check, Metro start, native typecheck, actual frontend/API tests, Go checks, Helm and mobile builds where tools are available. Record SBOM, patches and origin. If high vulnerabilities remain, block the supply-chain acceptance gate and propose a reviewed alternative; never suppress them to create green CI. Open a narrow PR linked to #76.
```

## PROMPT 3 — Horizon/FIELDWORK completion and PR #71 merge
```text
Inspect PR #71: Horizon and FIELDWORK V2. PR #75 is already merged into its head. Verify actual current head vs main, design tokens, browsers, Expo routes, server-authz, offline queue/coordinate correction, NeedMap real server verification filters, pledged-not-settled finance, Impact Passport evidencing, 91 Stitch contracts and 45 user-facing operations. Resolve all code conflicts with tests and screenshots. Fix accessibility, data truthfulness and mobile/desktop polish without creating fake activity. Execute canonical required jobs and rerun through trusted CI; preserve historic candidate and do not touch main directly. Only after all genuinely required status contexts are green and branch protection is satisfied, merge PR #71 using normal GitHub CLI with expected head SHA, verify actual new main commit/tree and create new candidate plan. If blocked by account-level Actions scheduling, keep PR unmerged, record exactly why and continue independent domain PRs. Never bypass checks.
```

## PROMPT 4 — Threat model and evidence integrity
```text
Read 04_TRUST_EVIDENCE_AND_SAFEGUARDING.md and inspect existing internal/evidence, internal/safety, auth policies, YSQL and RustFS integration. Write ADR-003 and a threat model for synthetic media, context fraud, collusion, evidence overwrite, malware, location exposure, vulnerable persons, prompt injection and mistaken outcome verification. Preserve create-only RustFS upload, streamed SHA-256 readback and moderation-before-download. Add additive provenance/review/audit records, safe public projections, reviewer conflict checks and privacy/redaction with SS-42/SS-43 and SS-24 contracts. Optional C2PA metadata is a provenance signal only, NOT factual truth. First build negative tests, replay/idempotency and tenant leakage tests using real YSQL/RustFS. Feature-flag rollout. Open a narrow PR and document missing external media-safety certification.
```

## PROMPT 5 — Impact measurement foundation (#72)
```text
Read 05_IMPACTOS_AND_IMPACT_INTELLIGENCE.md and docs/contracts/impact-outcome.v1.proposal.schema.json from PR #71 as PROPOSAL ONLY. Write ADR-004 and design an additive measured outcome model: goals, baseline, indicator, verified outputs, measured outcomes, sampling uncertainty, methods, beneficiary feedback, review attestations, community challenges, attribution caveats, maintenance followups and SDG/GIVE tags. Implement YSQL migrations, Go services, OpenAPI, policy-denied tests, outbox events and safe web/mobile projections. Separate observed work, reviewed output and actual change; do not generate causality or score without approved method. Pilot end-to-end project report with missing data explicitly UNKNOWN. Preserve Impact Passport source-based facts and avoid cross-tenant aggregate leakage. Link PR to #72; fail on unsupported publication claims.
```

## PROMPT 6 — Volunteer Ability Profile and deterministic matching (#73)
```text
Read 06_VOLUNTEER_MATCHING.md. Reuse existing contribution offers/project room and Response-to-Ability domain. Add opt-in Ability Profile, consent version, availability/capacity, skill tags, accommodations handled sensitively, approved opportunities, participant application, authorized acceptance/decline and fulfilled evidence. Build server-enforced eligibility and explainable deterministic recommendations first; AICO is disabled for v1. Coarse location, data minimization, restricted coordinator visibility, safeguards for minors, spam/contact controls, low-bandwidth and offline support. Define idempotency and concurrency in YSQL. Add negative cross-tenant, self-scope, capacity and withdrawal tests; measure actual acceptance/fulfilment, not clicks. Open a narrow PR linked to #73 with migration/rollback and human-approved pilot gate.
```

## PROMPT 7 — AICO integration and specialized AI employees
```text
Read 07_AICO_INTEGRATION.md. Discover the actual canonical AICO registry, role contracts and existing model router; do not invent endpoints or clone AI employees into iRespond. Propose/reuse domain roles: Needs Triage, Evidence Quality, Volunteer Coordinator, Resource Matcher, Intervention Planner, Safeguarding Triage, Translator, Impact Analyst, Maintenance Monitor and Programme Analyst. Add a least-privilege, consent-scoped Go adapter that can ONLY propose actions through typed schemas. Tool API allows read/query/propose but never autonomous publish, role-grant, financial move, match acceptance, safeguarding decision or evidence verification. Human approval occurs in a separate authenticated domain handler. Add schema validation, citation sourcing, cost caps, BYOK safety, model cost/performance router, kill switch, cache deletion and deterministic fallback. Write prompt injection, privacy and no-AICO tests; benchmark actual quality and operator feedback. Feature flag off by default; open a narrow PR after reviews.
```

## PROMPT 8 — Institutional ImpactOS MVP (#74)
```text
Read 05_IMPACTOS_AND_IMPACT_INTELLIGENCE.md and 03_ARCHITECTURE_AND_API_CONTRACTS.md. Design institution tenant boundaries reusing StratoID/SS-13 and existing project ACLs, not a separate global admin shortcut. Build verified institution membership, governed programme portfolios, action tasks, volunteer applications, milestone/evidence dashboards, approved outcome report and maintenance schedules. Use original FIELDWORK design, responsive accessible tables and real YSQL-backed data. Include programme owner, privacy officer, coordinator, volunteer and independent reviewer workflows. Deny cross-tenant reads/writes/events/export, respect location redaction, prohibit payment-received labels and public unsanctioned institutional claims. Demonstrate one low-risk consented pilot task end to end. Add complete OpenAPI/migrations and launch owner signoff; link to #74.
```

## PROMPT 9 — Industry intelligence activation and product packaging
```text
Operationalize only the evidence-grounded industry opportunities in the handoff: UNV IVY 2026 volunteering recognition, multidimensional GIVE-aware measurement, corporate volunteering programme fit, supporter-led mobilization and heightened synthetic-media verification. Design edition-level navigation for iRespond Community, ImpactOS Institutions, Volunteer & Skills Cloud and Action Intelligence; maintain single shared domain and identity. Identify safe cross-sell via approved Nvuto/GrowthOS workflows, never assume integration is already live. Prepare pilot onboarding journeys, fair opt-in outreach, bilingual/low-bandwidth user testing and genuine measurement definitions. Do NOT copy Dribbble/Behance designs or claim UN/CSR partner endorsement. Output product acceptance, architecture decision and launch hypotheses, not unsupported revenue figures.
```

## PROMPT 10 — Quality, red team, GA evidence and human approvals
```text
Read 02_GA_AND_RELEASE_ENGINEERING.md and 10_ACCEPTANCE_TEST_MATRIX.csv. Execute the entire quality matrix on the exact new source SHA: Go unit/integration, real YugabyteDB and RustFS, untrusted media, cross-tenant ACL, pledge finance, offline duplicate-safe workflows, model prompt injection, institutional user tasks, browser + React Native/Expo and authorized iOS/Android device smoke, accessibility, backup/restore, readiness/rollback/load tests. Reproduce actual Helm image/runbook evidence and module versions, hash artifacts and include sanitized screenshots from real execution. Do not set GITHUB_EVENT_NAME=push locally to trick the candidate generator. Source repo QA =/= AppForge signing, SkyForge live deployment or Droplet independent verdict. Create a new GA evidence ledger with every external gate, owner, date, reference, actual state and human decision. Never issue GA=true without certified evidence.
```

## PROMPT 11 — Execute 90-day plan and report
```text
Read 08_90_DAY_EXECUTION_PLAN.md. Convert it to a dependency-aware implementation backlog over Days 1–90, with weekly milestones, PR slices, labels, blocked-by links and quality gates. Make the plan capacity-aware after reading actual team resources; do not invent engineer availability or pilot participants. Implement in traceable daily increments, run relevant tests after each change, and stop unsafe launches. At each checkpoint update build/handoff/daily/<date>.md with exact SHA, implemented code, tested results, issues/PR links, blockers and next steps. Before finishing, produce Day-90 pilot verdict separately from external GA verdict. Keep the historical frozen GA candidate unchanged and don’t promise ongoing background execution from this prompt alone.
```

## PROMPT 12 — Final integration, quality council and merge verification
```text
Recheck every PR and open issue for Atlasfsp/iRespond created by this programme. Resolve branch conflicts legitimately, verify code owners/reviews and exact GitHub required checks, address vulnerabilities and regressions, and merge only once policies are satisfied. Confirm actual main SHA, document new release candidate source tree and build digests and keep ga=false pending named independent external gates. Prepare a final report with four sections: DONE with proof, PARTIAL with exact blocker, NOT STARTED with dependencies, and EXTERNAL HUMAN ACTION REQUIRED. Include URLs to evidence and desktop, responsive web, Expo Web and actual native device screenshots with precise capture methods. Do not falsely claim GA, paid-runner setup, missing human approvals, live impact results or merger of a blocked PR.
```

---

## Emergency stop / debugging prompt
```text
Stop destructive changes immediately. Preserve current worktree, uncommitted files and any original immutable evidence. Capture exact failing command, toolchain versions, exit status, log redacted for secrets, current HEAD/tree, related issue and anticipated impact. Distinguish environment/billing blocker, missing external authorization, source defect, data safety risk and independent certification absence. Suggest safest reversible fix and tests. Do not continue a merge, data migration, production deploy or role/safeguarding/payment mutation without satisfying its required gate.
```

## Compact master prompt for one Codex session
```text
Act as principal engineer, release manager, product architect and safeguarding-aware AI integration lead for Atlasfsp/iRespond. Read the full iRespond Codex handoff folder before editing. Work in the existing local repository; preserve my MacBook and all uncommitted files. First verify branch/source and frozen certification facts. Then execute P0 CI/security/PR#71, P1 evidence integrity and impact outcomes, P1/P2 volunteer matching, P2 AICO proposal-only integration, P2 tenant-isolated ImpactOS, and 90-day pilot/evidence work through small auditable PRs. Preserve Go/YugabyteDB/RustFS/Expo/StratoID/SS-13/Shared Services and pledge-only finance. Use my MacBook for an isolated self-hosted Linux runner; don't enable paid Actions, expose host secrets, disable required checks or invent CI success. Do not treat old candidate 6484873c as certification of new code. No fabricated projects, verified outcomes, matches, AI authority or human approvals. Produce tests, code, ADRs, artifacts, source screenshots, real PR/merge verification and clear blockers, keeping ga=false until external certification.
```
