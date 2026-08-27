# Google Stitch frontend adoption

Status: ACTIVE IMPLEMENTATION on `feature/stitch-unified-role-ui`.

The uploaded `iRespond_stitch_unified_role_based_interface` package is the visual design authority for the new iRespond mobile and responsive web frontends. Its `Impact Trust Architecture` design system defines the canonical palette, typography, spacing, card language and trust-state semantics.

## Canonical design tokens

- Primary institutional navy: `#002540`; primary container `#153B5B`.
- Community/action green: `#1B6B48`; positive container `#A2F0C4`.
- Urgent/report action: warm amber `#F2B544` / tertiary fixed `#FFDEAB`.
- Canvas: Slate Ice `#F7F9FC`; lowest surface `#FFFFFF`.
- Standard border: outline variant `#C3C7CE`.
- Error/safeguarding: `#BA1A1A` / `#FFDAD6`.
- Inter typography, heavy 800/900 headings, 11px uppercase spaced eyebrows, 15px base body.
- Mobile screen padding 20px; 14px gutters; 16px card padding; minimum controls 44px.
- Standard surfaces prefer tonal layering and hairline outlines over heavy shadows.

The mobile implementation centralizes these values in `apps/mobile/lib/stitch-theme.ts` and shared navigation chrome in `apps/mobile/components/StitchChrome.tsx`. Web styles use the same token family.

## Design package surface inventory

The supplied package contains more screens than the current backend contract. Examples include Home Discovery, Report a Need, Verification Queue, Impact Passport, Project Room Overview/Coordination, Funding & Resources, Ability Profile, Notifications, Privacy, Safeguarding, Trust & Safety, Institutional Partner/Audit hubs, donor transparency, logistics, maintenance, emergency response, credentials, command centers, SDG analytics and strategic portfolio views.

A Stitch screen is **not** treated as proof that a backend capability exists. Frontend adoption follows this rule:

1. If an API/domain capability exists, expose it to the correct authenticated/public/resource role and make the Stitch surface functional.
2. If the design depicts a future capability with no current backend contract, preserve it as design/product backlog; do not wire fake data as if it were operational.
3. Public observations remain distinct from verified facts.
4. Pledges remain distinct from regulated money movement/settlement.
5. Frontend visibility is never authorization; APIs remain deny-by-default.

## Current functional coverage being adopted

- public/community: platform doctrine, nearby needs, reporting, offline sync, evidence capture/upload, public need/project detail;
- authenticated community: contribution offers, own pledge management, notifications/preferences, privacy rights, Impact Passport, safety reports/appeals, role-invite acceptance;
- verifier/evidence roles: scoped verification transitions, evidence review/access, need-to-project conversion where authorized;
- project resource roles: project lifecycle, milestones, validation, contribution plans/offers, role invitations and funding-plan controls through a server-returned project permission envelope;
- safety roles: confidential review queue and decisions;
- responsive web: the same API/role boundaries through OIDC Authorization Code + PKCE and explicit origin allowlisting.

## GA branch rule

The frontend redesign is intentionally isolated from the currently frozen `main` candidate. The feature PR must not be merged into `main` while external certification is still bound to the exact frozen candidate SHA. After that constraint is lifted, the frontend becomes a new candidate and the documentation screenshot synchronizer should refresh the training manuals against the new interface.
