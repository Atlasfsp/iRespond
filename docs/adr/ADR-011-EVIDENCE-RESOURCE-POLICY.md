# ADR-011: resource decisions at evidence boundaries

Status: source implemented; live policy onboarding and certification unconfirmed.
Canonical contract: Platform Services 47ec7174f905dbc9e04f9ede4f5775e978540949,
`pkg/identity/oidc.go`, `pkg/tenancy/hierarchy.go`, `pkg/authz/httpclient.go`.

The existing RS256 verifier retains the signed `tenant_id`, validates canonical
hierarchical syntax, and preserves legacy tenantless identities for existing
unscoped routes. Tenantless identities receive no evidence-review/access authority.
Request tenant headers, JSON and global admin roles cannot supply resource scope.

Evidence review and signed access require human identity, the existing reviewer
role, and a fresh SS-13 `review` or `read` decision on `need_evidence:<id>`, class
`confidential`. Missing/malformed/unavailable/denied policy fails closed; no cached
allow after revocation. Configure `SS13_AUTHZ_BASE_URL` (Helm
`config.ss13AuthzBaseUrl`). Production startup requires it; missing configuration
also makes a configured evidence runtime unready. No direct SpiceDB or second
identity service is introduced.

Service calls additionally require server-supplied tenant and policy receipt.
Migration 0012 records both on each new immutable review and rejects unscoped inserts.
Historical audit fields stay NULL/UNKNOWN, without a tenant backfill. Retry intent
cannot cross the audit tenant. The private outbox includes tenantId but no reviewer
identity, raw policy reason, coordinates or signed object URL.

Existing globally unique evidence IDs require explicit canonical SS-13 relationship
registration. Do not auto-grant legacy rows, invent institutional ownership or infer
membership from tenant syntax. The upstream policy authority must validate resource
ownership; contract fixtures are synthetic and are not live service certification.
New institutional persistence, reports, events and exports still require their own
verified membership and tenant-scoped YSQL predicates. Consumers of private review
events must enforce tenant scope and the Shared Services broker policy.

Before production: verify issuer tenant/actor claim mappings, register the local
resource/permission mapping with Shared Services, approve service transport/workload
identity, run negative cross-tenant tests against live policy, and retain named gate
receipts. No upstream service/policy mutation or external approval is claimed here.
Rollback by closing these routes or rolling back the candidate; never restore a
role-only evidence allow path. Keep migration/audit history and ga=false.
