# Canonical iRespond frontend

Status: **CANONICAL FRONTEND CANDIDATE** on `feature/stitch-unified-role-ui`.

The Google Stitch package identified by SHA-256 `aeb72a9e78cae84999a31b41d61375fd4d9629e90fa766999c2921ccb09a9b82` is the visual source of truth for iRespond mobile and responsive web. The package contains **77 supplied screen contracts**. iRespond adds narrowly scoped design-system extensions only where a real backend capability exists but the supplied package did not provide an explicit screen.

## Runtime ownership

There is one browser runtime: `apps/web/app.js`. `apps/web/app-v2.js` is forbidden and removed. The browser loads the canonical runtime plus `stitch-catalog.js`, which provides a role-aware surface registry without replacing or bypassing API authorization.

Mobile uses `apps/mobile/lib/stitch-theme.ts`, `apps/mobile/components/StitchChrome.tsx` and `apps/mobile/lib/stitch-screen-catalog.ts`. `/catalog` exposes live role-appropriate surfaces by default; the design backlog is opt-in and never presents fake production actions.

## Truth boundary

- A report is an observation until the verification state machine says otherwise.
- A pledge is a commitment, not evidence that money was charged, reserved or settled.
- A visual role filter is navigation only; global and resource-specific authority remains server-enforced.
- A Stitch design with no persistence/authorization/API contract is a canonical **design** surface, not a functional claim.
- Internal service APIs are not exposed merely to achieve superficial coverage.

## API coverage contract

`docs/frontend/frontend-api-map.json` maps every user-facing OpenAPI operation to a canonical screen, mobile route, web route and access category. `tools/verify_frontend_api_coverage.mjs` makes this executable CI policy.

For this candidate the OpenAPI has 51 operations: 45 are user-facing and must have frontend owners; five runtime probes/build endpoints plus the internal notification creation endpoint are explicitly excluded from untrusted frontend exposure. Any API change that breaks this count or leaves a user-facing operation unmapped fails `web-verify` until the decision is updated deliberately.

## Design-system extension rule

When the backend exposes a capability absent from the 77 supplied screens, create an `extended` screen contract using the same Inter type scale, institutional navy/action green palette, warm-amber action semantics, 20px screen padding, 16px cards, hairline outlines and 44–52px controls. Extended screens must inherit the same observation/verification, money-settlement and authorization truth rules.

## Release boundary

This branch must remain unmerged while external certification is bound to frozen `main` SHA `6484873c8a0c3306a5972247bcc9981da4051bc6`. After that external constraint is released, this frontend becomes a new candidate and the documentation screenshot synchronizer must recapture the canonical Stitch interface.
