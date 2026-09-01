# iRespond responsive web application

This directory is a dependency-free browser application shell for the iRespond public/institutional web surface. It exists so the role/capability and API wiring can be validated without changing the repository's frozen pnpm dependency graph while the Google Stitch presentation layer is adopted.

## Runtime configuration

`config.js` contains **public** runtime values only:

- `apiBaseUrl` — iRespond API origin.
- `oidcIssuer` — StratoID/OIDC issuer.
- `oidcClientId` — public browser client ID registered for Authorization Code + PKCE.
- `demoMode` — explicitly enables the isolated browser demo account. It is also enabled automatically for an unconfigured loopback preview.
- `scope` — normally `openid profile`.

Never place client secrets, service tokens, provider credentials or user data in this file. Browser authentication uses Authorization Code + PKCE and stores the access token in `sessionStorage`, not a persistent cookie/local-storage credential.

The demo account uses only bundled sample data and stores a non-secret session marker in `sessionStorage`. Keep `demoMode: false` for production; enabling it does not create or bypass a production identity.

The API must explicitly allow the deployed web origin through its CORS allowlist. Wildcard origins are not an acceptable production configuration for authenticated API access.

## Role-aware exposure

The web navigation uses `/v1/session` role claims to remove irrelevant privileged modules. Server endpoints remain the authoritative policy boundary and continue to return 403 when an identity is not authorized. Project-specific authorization is also checked by the backend; UI visibility is an ergonomics layer, not a security control.

User-facing API coverage includes need discovery/reporting, evidence upload/access/review, verification transitions, need-to-project conversion, project rooms, contribution offers/review/fulfilment, milestones, project role invitation/acceptance, funding plans/pledges, Impact Passport, notifications/preferences, privacy consents/requests, safety reporting/appeals and the restricted safety review queue.

## Presentation layer

Behavior is intentionally separated from `styles.css` and semantic HTML. The attached Stitch design package is the presentation authority for the final visual layer; replacing CSS/markup must not weaken the API, OIDC or role-capability boundaries described above.
