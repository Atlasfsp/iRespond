# iRespond GA Readiness Ledger

Status: **NOT GA — repository-controlled hardening substantially advanced; external certification remains**

This ledger distinguishes implementation that is demonstrably green in repository CI from evidence that requires production infrastructure, provider accounts, app stores, legal review, security assessment, operational staffing or live drills. A capability is never called production-certified merely because an adapter exists.

## Repository-controlled gates

| Gate | State | Evidence / remaining work |
|---|---|---|
| Mobile TypeScript gate | PASS | GitHub Actions `mobile:typecheck` |
| YugabyteDB relational compatibility | PASS | CI boots real YugabyteDB/YSQL and executes migrations/integration tests |
| Need report + idempotency | PASS | YSQL integration tests |
| Verification lifecycle | PASS | server-authoritative transitions + verification history |
| Evidence signed upload | PASS | S3-compatible/MinIO integration test |
| Evidence moderation before access | PASS | pending-review gate + role-protected review |
| Need → Action Project | PASS | confirmed need required; lineage retained |
| Project governance | PASS | roles, milestones, validation, maintenance owner and guarded transitions |
| Contribution commitments | PASS | offer/accept/decline/withdraw/fulfil lifecycle |
| Mobile primary workflow | PARTIAL | 10 implemented Expo Router screens; settings, notifications, impact passport and richer institutional surfaces remain |
| Reproducible repository metrics | PASS | `tools/repo_metrics.sh` |
| Production migration command | PASS | `cmd/migrate`, idempotent migration ledger |
| Production API image | PASS | non-root image builds in CI |
| Runtime readiness/version endpoints | PASS | `/readyz` fails closed; `/version` exposes build evidence |
| Graceful shutdown | PASS | bounded SIGINT/SIGTERM shutdown tested in code |
| Strict production configuration | PASS | `IRESPOND_ENV=production` fails startup when relational/OIDC/evidence configuration is incomplete |
| Shared SS-44 Geospatial adapter | PASS | projection broker + outbox-driven synchronization; production endpoint certification remains external |
| StratoID/OIDC | PASS (adapter) | mobile PKCE + API OIDC/JWKS boundary; production tenant/key-rotation evidence remains external |
| SS-13 authorization adapter | PASS | fail-closed external policy-decision seam; production policy service certification remains external |
| SS-03 Redpanda/NATS event backbone | PASS | transactional outbox publisher, retry/claim behavior and projection events |
| SkyForge deployment package | PASS | Helm chart, probes, security context, NetworkPolicy and CI rendering/linting |
| SS-42 media adapter | PARTIAL | safe signed-object workflow exists; canonical Shared Media service contract/certification remains |
| SS-43 Trust & Safety adapter | PARTIAL | local moderation workflow exists; canonical shared review/enforcement integration remains |
| SS-18 notification adapter | TODO | shared notification intent/delivery integration remains |
| SS-22 PayCore donations/counterpart funding | TODO | financial movement deliberately not implemented locally |
| SS-24 consent/privacy adapter | TODO | purpose/consent, DSAR and erasure orchestration remain |
| SS-05 Vault secret integration | PARTIAL | Helm uses secret references; runtime Vault broker/rotation evidence remains |
| SS-06 OTLP observability | TODO | production metrics/traces/logs export remains |
| SS-07 gateway contract/rate limits | TODO | edge WAF/rate-limit policy contract remains |
| API contract completeness | PARTIAL | OpenAPI exists but must cover every current route and error state |
| Repository security boundary | PASS when CI green | secret/private-key, PostGIS regression, non-root/read-only and auth-bypass guard added in current GA hardening PR |
| Dependency/SBOM/image vulnerability scanning | TODO | GA CI supply-chain lane remains |
| Load/performance tests | TODO | thresholds, soak and saturation evidence remain |
| Backup/restore runbook | TODO | repository procedure + external YugabyteDB restore evidence remain |
| AppForge build/release handoff | TODO | pipeline contract, provenance and mobile signing/store delivery remain |
| Droplet independent release judgment | TODO | independent final-candidate QA evidence remains |

## Current measurable implementation baseline

The metrics job is authoritative for repeatable counts. At the runtime-hardening candidate immediately before this ledger update it reported **2,874 authored source lines across 61 source files and 10 mobile screens**. Metrics are expected to increase as GA slices land; use the newest green workflow for the current number.

## External / human / provider gates

The following cannot be truthfully completed through repository CI alone:

- production StratoID tenant/client registration, signing-key rotation and outage behavior;
- production Shared Services endpoints, workload identities, credentials and service-to-service authorization;
- production YugabyteDB topology, TLS, multi-zone/regional policy, backups, point-in-time recovery and restore drill;
- production media/object storage, malware scanning/transcoding, retention and deletion certification;
- PayCore/payment-provider merchant onboarding, regulated fund flows, refunds, reconciliation and financial controls;
- Apple Developer and Google Play accounts, signing, privacy declarations, review and store approval;
- safeguarding policy approval and trained reviewers for minors/vulnerable people;
- launch-jurisdiction legal/privacy review, terms, community standards and donation rules;
- independent penetration test and remediation evidence;
- real-device accessibility, low-bandwidth and device-matrix certification;
- incident response, abuse response, backup/restore and disaster-recovery drills;
- production DNS/TLS/CDN/gateway and OTLP/observability connectivity;
- real SkyForge staging/production deployment, smoke test, canary and rollback evidence;
- independent Droplet release verdict against the immutable final candidate.

## GA definition

iRespond may be called GA only when every launch-blocking repository-controlled gate is green and every launch-scope external gate has dated evidence, named ownership and an accepted residual-risk record. Missing external evidence is a blocker, not a documentation exception.
