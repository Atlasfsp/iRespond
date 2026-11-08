# ADR: iRespond ImpactFlow v1 Design System & Challenges Integration

**Status:** Accepted for implementation on `feat/impactflow-v1-20261108` (NOT GA)  
**Date:** 2026-11-08  
**Base SHA:** `6298e9380da19d648d4b31500d820ade5d98b255` (PR #71 head)

## Context

The user approved **iRespond ImpactFlow (Design Direction 01)** (`references/ImpactFlow_Direction_01_User_Approved.jpeg` and `references/ImpactFlow_Approved_Visual_Concept.png`) alongside the companion **iRespond Challenges** engineering specification. The repository already enforces strict executable contracts for:
- Single web runtime (`apps/web/app.js`, no `app-v2.js`)
- 77 supplied Stitch screen contracts + extended screens (`docs/frontend/STITCH_SOURCE_MANIFEST.json`)
- Full OpenAPI-to-frontend operation coverage (`tools/verify_frontend_api_coverage.mjs`, `tools/verify_frontend_execution.mjs`, `tools/verify_frontend_reachability.mjs`, `tools/verify_frontend_authorization.mjs`)
- Existing FIELDWORK v2 and Horizon regression gates (`tools/verify_fieldwork_design.mjs`, `tools/verify_horizon_experience.mjs`, `tools/ci/fieldwork-contrast.test.mjs`, `tools/ci/mobile-theme.test.mjs`).

## Decisions

1. **Additive, Non-Destructive Token & Style Layering:**
   - Introduce `apps/web/impactflow-tokens.css` and `apps/web/impactflow.css` loaded after `fieldwork.css` in `apps/web/index.html`, and `apps/mobile/lib/impactflow-tokens.ts` in Expo mobile.
   - Retain `--fw-*` CSS custom properties and `Fieldwork` / `Stitch` TypeScript exports bridged to ImpactFlow tokens so existing verification scripts and screens remain 100% compatible.
   - Enforce the accessibility contrast refinement: primary action fill uses `#0A6C50` with `#FFFFFF` text (6.41:1 AA PASS), forest sidebar/hero uses `#123E34` with `#FFFFFF` text (11.9:1 AA PASS), and bright action green `#24A27B` and amber `#F2B84B` never pair with white normal text.

2. **Preservation of Navigation & Security Contracts:**
   - Mobile keeps the 5-tab bottom bar (`Home`, `Actions`, `Report`, `Impact`, `Profile`) and surfaces Challenges prominently in Home quick actions, Featured Challenge, and Actions/Workspace.
   - Desktop web (`apps/web/app.js`) renders the approved dark forest-green (`#123E34`) sidebar with `Home`, `Discover`, `Challenges`, `Projects`, `Impact`, `My Activity` and role-gated `For Organisations` (`Institution Workspace`, `Programmes`, `Judging`, `Sponsors`, `Safety Operations`, `Settings/Privacy`), plus top search and header actions, while preserving all existing hash routes (`#home`, `#needs`, `#verification`, `#project`, `#contributions`, `#funding`, `#impact`, `#notifications`, `#privacy`, `#safety`, `#safety-ops`).

3. **Authoritative Challenges Domain Integration:**
   - Add additive migration `services/api/migrations/0014_challenges_domain.sql` (after PR #71's `0011`–`0013`) and Go package `services/api/internal/challenges` + `services/api/cmd/server/challenge_routes.go`.
   - Enforce dual-human rule approval, immutable published rules, minor guardian consent receipts, judge COI declarations with non-self-clearance, deterministic 10,000-basis-point rubric scoring, appeal holds prior to result publication, and strict separation between sponsor pledges, approved awards, and PayCore-confirmed prize fulfillment.

4. **Truthful UI Data & Feature Flag Rollout:**
   - Never ship illustrative numbers from the design mockup (`12,340`, `87`, `286`, `52`) as live production metrics. All metrics come from server APIs or display explicit `No verified metrics yet` / `OFFLINE DEMO` provenance labels.
   - Rollout flags (`impactflow_web_enabled`, `impactflow_mobile_enabled`, `impactflow_challenges_enabled`, `impactflow_institution_enabled`) are exposed in configuration and runtime metadata with safe defaults.
