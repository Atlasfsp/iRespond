# Start here — iRespond Codex Engineering Handoff

**Prepared:** November 2, 2026, Africa/Lagos  
**Purpose:** a practical, multi-workstream handoff for Codex to continue iRespond engineering, preserve existing releases and certify later releases correctly.  
**Output type:** plans, implementation prompts, acceptance matrix and dependency manifest; this package itself does **not** modify the GitHub repository or constitute GA certification.

## Quick start on MacBook
1. Locate your **existing** local `Atlasfsp/iRespond` Git working directory. Do not clone a second copy or reset ongoing local changes.
2. Extract this package into a separate folder under that repository, e.g. `.codex-handoff/irespond-2026-11-02/`. Keep `build/` generated test evidence out of Git unless explicitly approved.
3. Open Codex **at the existing repository root** and paste the `Compact master prompt` in `09_CODEX_EXECUTION_PROMPTS.md` or start with `PROMPT 0` and proceed in order.
4. Codex must first refresh repository/PR/candidate state and verify all exact SHA assumptions. These SHA values are snapshots and may change.
5. Do not alter frozen candidate or main directly; use feature branches, actual tests and normal branch-protected merges.
6. Do not enable paid GitHub Actions; use an **isolated Linux VM inside MacBook** for trusted CI, never a permanently exposed runner executing untrusted public PR code.

## Contents and suggested reading order
| File | What it provides |
|---|---|
| `00_START_HERE.md` | Entry instructions and versioned references |
| `01_MASTER_ENGINEERING_HANDOFF.md` | Mission, baseline facts, immutable boundaries, domain priorities and Codex autonomy limits |
| `02_GA_AND_RELEASE_ENGINEERING.md` | Runner, dependencies, CI gates, AppForge/SkyForge/Droplet, old/new candidates |
| `03_ARCHITECTURE_AND_API_CONTRACTS.md` | Components, YSQL/RustFS data contracts, proposed endpoints and ADRs |
| `04_TRUST_EVIDENCE_AND_SAFEGUARDING.md` | Threat register, evidence provenance, reviewer controls, C2PA and privacy tests |
| `05_IMPACTOS_AND_IMPACT_INTELLIGENCE.md` | Institution tenancy, programme UX, impact measurement and KPI definitions |
| `06_VOLUNTEER_MATCHING.md` | Consent-first Ability Profile, deterministic matching, fairness and fulfilment |
| `07_AICO_INTEGRATION.md` | AICO roles, agent gateway, human approvals, model selection and evals |
| `08_90_DAY_EXECUTION_PLAN.md` | Week-by-week schedule, milestones, owners, dependency network and go/no-go |
| `09_CODEX_EXECUTION_PROMPTS.md` | 13 sequential, copy-ready prompts plus compact master and emergency stop |
| `10_ACCEPTANCE_TEST_MATRIX.csv` | Test evidence matrix with pass/fail/blocked rows to be filled with real results |
| `11_ENGINEERING_BACKLOG.csv` | Ordered stories, issue links, dependencies and expected artefacts |
| `12_SOURCE_AND_STATUS_MANIFEST.json` | Verifiable source baselines and official references (dated snapshot) |
| `13_RELEASE_DECISION_TEMPLATE.md` | Real release evidence and decision worksheet |

## Exact existing references (as of November 2, 2026)
- Canonical GitHub: https://github.com/Atlasfsp/iRespond
- Main: `c12a4b5b8736700c2fdf2739fcd6f9a41c233521`
- Frozen GA certification reference: `6484873c8a0c3306a5972247bcc9981da4051bc6` (source), workflow `32952095093`, GA false (historical evidence).
- Current integrated visual PR: https://github.com/Atlasfsp/iRespond/pull/71; head `e1d9cb524164aa0e1c8fdaf0eb878c49dac80536`, unmerged and required checks blocked as verified.
- FIELDWORK design sub-PR #75 is already merged **into #71's feature branch**.
- Source issue references: [#53](https://github.com/Atlasfsp/iRespond/issues/53) external GA, [#72](https://github.com/Atlasfsp/iRespond/issues/72) Impact Intelligence, [#73](https://github.com/Atlasfsp/iRespond/issues/73) AICO & matching, [#74](https://github.com/Atlasfsp/iRespond/issues/74) ImpactOS, [#76](https://github.com/Atlasfsp/iRespond/issues/76) dependencies.

## Exit definition
**Engineering pilot ready** = implemented and source-verified capabilities, tested tenant isolation, privacy, consent, real programme and outcome evidence, human approvals and controlled pilot runbook. **Public GA** = all required external gates (and normal protected CI) certified against same exact new source SHA. These are **different milestones**. Keep `ga=false` until the latter is true.

## One-shot Codex start
```
Read all files in .codex-handoff/irespond-2026-11-02/ and execute
09_CODEX_EXECUTION_PROMPTS.md beginning with PROMPT 0.
Do not clone, overwrite work, force-merge, fake CI, turn on paid GitHub Actions,
expose personal Mac files, or change the immutable historical candidate.
Use existing Go/YugabyteDB/RustFS/Expo/StratoID/Shared Services. Open small
reviewable PRs with real tests and report exact source SHA and blockers.
```

The path above is a suggested extraction location, not a claim that the files have been installed on your MacBook.
