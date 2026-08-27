# Google Stitch frontend adoption

Status: **CANONICAL FRONTEND CANDIDATE** on `feature/stitch-unified-role-ui`.

The uploaded `iRespond_stitch_unified_role_based_interface` package, SHA-256 `aeb72a9e78cae84999a31b41d61375fd4d9629e90fa766999c2921ccb09a9b82`, is the visual design authority for iRespond mobile and responsive web. It contains 77 supplied screen contracts. `docs/frontend/STITCH_SOURCE_MANIFEST.json` is the machine-readable inventory and records which designs are currently backend-backed and which remain design-only.

## Canonical design tokens

- Primary institutional navy: `#002540`; primary container `#153B5B`.
- Community/action green: `#1B6B48`; positive container `#A2F0C4`.
- Urgent/report action: warm amber `#F2B544` / tertiary fixed `#FFDEAB`.
- Canvas: Slate Ice `#F7F9FC`; lowest surface `#FFFFFF`.
- Standard border: outline variant `#C3C7CE`.
- Error/safeguarding: `#BA1A1A` / `#FFDAD6`.
- Inter typography; 800/900 headings; 11px uppercase spaced eyebrows; 15px body.
- Mobile screen padding 20px; 14px gutters; 16px card padding; minimum controls 44px and primary controls 52px.
- Prefer tonal layering and hairline outlines over heavy shadows.

Mobile centralizes these values in `apps/mobile/lib/stitch-theme.ts`; web uses the same token family through `DESIGN_TOKENS.css`, `stitch.css` and `catalog.css`.

## Functional adoption policy

1. If an API/domain capability exists, expose it through the relevant Stitch or extended screen and let the server determine authorization.
2. If a Stitch design depicts a capability with no current backend contract, keep it canonical as a design surface but disable production actions.
3. If the backend exposes a real capability absent from the Stitch package, extend the detailed design system rather than inventing a second visual language.
4. Public observations remain distinct from verified facts.
5. Pledges remain distinct from regulated money movement and settlement.
6. Frontend visibility is never authorization; APIs remain deny-by-default.

## Enforced coverage

`frontend-api-map.json` maps all 45 current user-facing OpenAPI operations to frontend owners. Runtime probes/build metadata and the internal service notification endpoint are intentionally not exposed to untrusted frontends. `verify_frontend_api_coverage.mjs` and `verify_web_frontend.mjs` make screen count, archive digest, API coverage, canonical browser runtime and no-fake-functionality rules permanent CI gates.

## GA branch rule

The frontend redesign remains isolated from the frozen `main` candidate. It must not merge while external certification is bound to exact SHA `6484873c8a0c3306a5972247bcc9981da4051bc6`.
