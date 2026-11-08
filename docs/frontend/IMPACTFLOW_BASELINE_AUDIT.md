# iRespond ImpactFlow v1 — Baseline Repository & Security Audit (D0)

**Date:** 2026-11-08  
**Canonical repository:** `Atlasfsp/iRespond` (`https://github.com/Atlasfsp/iRespond`)  
**Observed `main` SHA:** `c12a4b5b8736700c2fdf2739fcd6f9a41c233521`  
**Observed PR #71 (`feat/impact-experience-evolution-20261101`) head SHA:** `6298e9380da19d648d4b31500d820ade5d98b255`  
**Working branch:** `feat/impactflow-v1-20261108` (branched directly from PR #71 head `6298e9380da19d648d4b31500d820ade5d98b255`)  
**Release status:** **NOT GA** (`docs/GA_READINESS.md` external certification gates remain open)

## 1. Branch & PR #71 Reconciliation

- `origin/main` (`c12a4b5b8736700c2fdf2739fcd6f9a41c233521`) has migrations `0001`–`0010` and the initial Stitch role-based UI adoption.
- Open PR #71 (`feat/impact-experience-evolution-20261101` at `6298e9380da19d648d4b31500d820ade5d98b255`) adds critical security, field reporting, offline sync, and evidence hardening:
  - Migrations `0011_evidence_review_audit.sql`, `0012_evidence_policy_receipts.sql`, and `0013_field_report_context.sql`.
  - SS-13 resource policy receipts (`services/api/cmd/server/evidence_policy.go`) and human-only evidence review enforcement.
  - Reporter attribution, offline queue serializer (`withQueueOperation`), legacy coordinate review recovery (`pendingNeedLocationReviewCount`, `confirmQueuedNeedLocation`), and private evidence media cleanup.
- **Integration decision:** `feat/impactflow-v1-20261108` is based directly on `6298e9380da19d648d4b31500d820ade5d98b255` so zero PR #71 security or offline fixes are lost. New Challenges database DDL is allocated additively at migration `0014_challenges_domain.sql`.

## 2. Baseline Inventory Summary

- **Expo Router mobile routes:** 25 routes (`apps/mobile/app/**`), all verified in `docs/frontend/navigation-graph.json`.
- **Canonical web runtime (`apps/web/app.js`):** 11 baseline hash routes (`#home`, `#needs`, `#verification`, `#project`, `#contributions`, `#funding`, `#impact`, `#notifications`, `#privacy`, `#safety`, `#safety-ops`).
- **OpenAPI operations (`services/api/openapi.yaml`):** 51 baseline operations (45 user-facing mapped in `docs/frontend/frontend-api-map.json`, 6 explicitly excluded runtime probes/internal endpoints).
- **Stitch screen contracts (`docs/frontend/STITCH_SOURCE_MANIFEST.json`):** 77 supplied Stitch screen contracts (archive SHA-256 `aeb72a9e78cae84999a31b41d61375fd4d9629e90fa766999c2921ccb09a9b82`) + 14 backend-driven extended screens.

## 3. Baseline Test Execution Results

All baseline repository gates executed on `6298e9380da19d648d4b31500d820ade5d98b255`:

| Gate / Command | Result | Details |
|---|---|---|
| `pnpm mobile:typecheck` | PASS | `tsc --noEmit` clean in `apps/mobile` |
| `bash tools/ci/local-verify.sh` | PASS | 23 Node tests + 5 Python unit tests + 7 frontend/design verifiers + offline demo + OpenAPI contract + security boundary + CI runtime pins |
| `cd services/api && go test ./...` | PASS | All 15 Go packages pass unit/contract suites |
| Local Docker daemon (`docker ps`) | BLOCKED (Environment) | Local OrbStack Docker socket not running in this workstation session; live containerised YugabyteDB/RustFS CI steps remain gated by CI / Docker availability |

## 4. Pre-change Visual Baseline

Captured at commit `6298e9380da19d648d4b31500d820ade5d98b255` in `build/evidence/impactflow/baseline/`:
- `baseline-home-compact-320.png` (320×740)
- `baseline-home-mobile-390.png` (390×844)
- `baseline-home-tablet-768.png` (768×1024)
- `baseline-home-desktop-1440.png` (1440×900)
