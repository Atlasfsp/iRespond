# AGENTS.md — iRespond Engineering & ImpactFlow Execution Guide

## 1. Canonical Scope & Repository Boundary

- **Writable repository:** `Atlasfsp/iRespond` only. Never write to external shared-service repositories.
- **Architecture preservation:** Go/YugabyteDB (YSQL) transactional backend, RustFS S3 create-only evidence storage with SHA-256 verification, StratoID OIDC PKCE authentication, SS-13 fail-closed authorization, SS-18 notifications, SS-24 privacy, and SS-43 trust & safety.
- **PR #71 preservation:** Always retain migrations `0011`–`0013`, reporter identity attribution, evidence review policy receipts, coordinate confirmation, and serialized offline sync queues. Never bypass branch protections or claim GA readiness (`ga=false` until external certification gates in `docs/GA_READINESS.md` are signed off).

## 2. Verification & Build Commands

Run these commands from the repository root (`PATH` including `/opt/homebrew/bin` on macOS):
- `pnpm mobile:typecheck` — TypeScript verification for `apps/mobile`
- `bash tools/ci/local-verify.sh` — Runs all syntax checks, Node unit tests (`tools/ci/*.test.mjs`), Python unit tests, frontend/design verifiers (`verify_fieldwork_design.mjs`, `verify_horizon_experience.mjs`, `verify_web_frontend.mjs`, `verify_frontend_api_coverage.mjs`, `verify_frontend_execution.mjs`, `verify_frontend_reachability.mjs`, `verify_frontend_authorization.mjs`, `verify_impactflow_tokens.mjs`, `verify_impactflow_route_parity.mjs`, `verify_impactflow_truth_states.mjs`), `tools/offline_demo.test.mjs`, `tools/verify_openapi_contract.py`, `tools/security_boundary.sh`, and `tools/verify_ci_runtime_pins.sh`.
- `cd services/api && go test ./... && go vet ./...` — Go API unit, route, state-machine, and authorization tests.

## 3. Hot-File Ownership & Frontend Rules

- **Single browser runtime:** `apps/web/app.js` is the sole canonical web runtime. Do not create `app-v2.js`.
- **Contract synchronization:** Any change to routes or OpenAPI operations must atomically update `services/api/openapi.yaml`, `docs/frontend/frontend-api-map.json`, `docs/frontend/navigation-graph.json`, `docs/frontend/STITCH_SOURCE_MANIFEST.json`, `apps/web/stitch-screen-catalog.json`, and `apps/mobile/lib/stitch-screen-catalog.ts`.
- **Design-system rules:** Follow `DESIGN.md` and `docs/design/FIELDWORK_DESIGN_SYSTEM_V2.md`. Never use white text on `#24A27B` or `#F2B84B`, never cover card click areas with hover-only overlays, and never ship illustrative mockup metrics as live data.
