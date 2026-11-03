# ADR-002: verified tenant, actor and resource policy

Status: contract decision; institution persistence and full route wiring pending.
Date: 2026-11-02. Related: #60, #73, #74.

## Canonical sources discovered

Platform Services source `47ec7174f905dbc9e04f9ede4f5775e978540949`:

- `pkg/identity/oidc.go`: verified tenant/actor context, canonical `tenant_id`,
  `actor_type` and bounded `delegated_by` claims; absence is not tenant authority.
- `pkg/authz/httpclient.go`: `POST /api/v1/check`, X-Tenant-Id, Subject/Action/
  Resource/Class body; one bounded typed decision with a nonblank decision_id.
- `docs/security/IAM_AUTHZ_HARDENING.md`: Authentik/OIDC authentication authority,
  SpiceDB relationship/permission authority, fail-closed consistency receipts.

[Canonical HTTP contract](https://github.com/Atlasfsp/Nvuto-Platform_Services/blob/47ec7174f905dbc9e04f9ede4f5775e978540949/pkg/authz/httpclient.go).
The existing StratoID/OIDC integration remains iRespond's compatibility boundary;
this decision does not introduce a second identity provider, JWT service or database.

## Decision

A global reviewer/admin role is insufficient to grant an institution resource.
New domain routes require verified subject, tenant and actor context, an explicit
resource-policy decision and tenant-scoped YSQL predicates. Do not trust client
headers, JSON tenant IDs, role visibility or model output as authority. Tenantless
legacy rows must not be silently reclassified into a default institution. Human
moderation must reject AI/service actors even if a token carries reviewer roles.

Before wiring new resources, the SS-13 adapter must reject missing receipts,
unknown fields, multiple/oversized JSON values, redirects and unavailable policy.
Every check re-evaluates policy; a stable idempotency key must not replay a previous
allow after revocation. Existing nonempty request keys become fresh per check.
The result is not logged with subject/resource or raw sensitive reasons.

This adapter fix does not claim that evidence routes already enforce tenant scope.
That requires a separately reviewed identity/scope migration and resource binding.
Policy action registration, workload identity, TLS and production integration remain
owned by Shared Services; contract tests are not live SS-13 certification.

Future institution membership, project linkage, invitations, reports, events and
exports must use the same verified scope, with no global-admin shortcut. Integrations
remain off/fail-closed until their actual external contracts and owners are ready.
Hasura-facing projections and shared hosted-service migration preserve Go domain
write authority and the canonical YugabyteDB/RustFS/StratoID/SS-13 seams.

## Validation and rollback

Negative fixtures failed against the original adapter before implementation.
Race-enabled tests cover receipt shape/size, redirect refusal and fresh revocation.
The original valid SS-13 tenant/request contract remains tested. No new dependency,
endpoint, registry role or live provider permission is invented. Roll back consumers
by disabling the new feature; never restore a missing-receipt allow as a fallback.
