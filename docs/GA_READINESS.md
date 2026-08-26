# iRespond GA Readiness Ledger

Status: **NOT GA — repository-controlled hardening is advanced; production/shared-service certification and launch evidence remain**

This ledger distinguishes implementation proven by repository CI from evidence that requires production infrastructure, provider accounts, app stores, legal/privacy review, independent security assessment, operational staffing or live drills. A capability is never called production-certified merely because an adapter or local implementation exists.

Last reconciled after the RustFS evidence-integrity, executable API route-contract and CI load-regression hardening slices.

## Repository-controlled gates

| Gate | State | Evidence / remaining work |
|---|---|---|
| Mobile TypeScript gate | PASS | Permanent GitHub Actions `mobile:typecheck` gate. |
| YugabyteDB relational standard | PASS | Real YugabyteDB/YSQL boots in CI; migrations and integration tests execute against it. Plain PostgreSQL/PostGIS is not the production relational target. |
| YugabyteDB recovery verification | PASS (repository) | CI performs `ysql_dump`, restores an isolated database, and verifies table/migration integrity. Production multi-zone backup/PITR drills remain external. |
| Need report + idempotency | PASS | YSQL integration tests and transactional outbox boundaries. |
| Verification lifecycle | PASS | Server-authoritative transitions plus verification history. |
| Evidence object store | PASS (repository) | RustFS is the canonical SS-02 object store; digest-pinned RustFS runs in CI through the standard AWS S3 SDK. Production multi-node RustFS certification remains external. |
| Evidence byte integrity | PASS | Completion verifies size, streams stored bytes, derives SHA-256, rejects declared-digest mismatch, persists verified digest in YugabyteDB and prevents moderation on mismatch. |
| Evidence upload immutability | PASS | Presigned create-only PUT (`If-None-Match: *`) is tested against real RustFS; replay cannot replace an existing evidence object. |
| Evidence moderation before access | PASS | Pending-review gate plus protected review workflow; signed download is unavailable before approval. |
| Need → Action Project | PASS | Confirmed need required; lineage retained. |
| Project governance | PASS | Roles, milestones, validation, maintenance owner and guarded transitions. |
| Contribution commitments | PASS | Offer/accept/decline/withdraw/fulfil lifecycle. |
| Impact Passport | PASS (repository) | Server-evidenced impact history and mobile experience implemented; external credential/attestation interoperability remains future work. |
| Trust & Safety workflow | PASS (repository) | Confidential reports, reviewer separation, decisions, appeals and audit/outbox evidence in YugabyteDB; production shared SS-43 enforcement certification remains external. |
| Privacy & data rights | PASS (repository) | Consent history and access/export/correction/deletion request workflow in YugabyteDB plus mobile Privacy & Data Rights surface; shared SS-24 fulfillment certification remains external. |
| Transparent counterpart funding | PASS (domain) | Funding plans, counterpart amounts and auditable pledges are implemented; iRespond deliberately does not represent pledges as settled money. Licensed PayCore/payment movement remains external. |
| Notifications experience | PASS (repository) | Notifications domain/mobile experience and tested SS-18 intent client exist. Production delivery endpoints/credentials and channel certification remain external. |
| Mobile primary workflow | PARTIAL | **15 implemented Expo Router screens**. Core community/user journeys exist; richer institutional/admin, accessibility/device certification and app-store launch surfaces remain. |
| Reproducible repository metrics | PASS | `tools/repo_metrics.sh`; latest fully green load candidate reported **5,409 authored source lines across 90 source files and 15 mobile screens**. |
| Production migration command | PASS | `cmd/migrate` with idempotent migration ledger. |
| Production API image | PASS | Non-root distroless production image builds in CI; both builder/runtime bases are digest pinned. |
| Runtime readiness/liveness/version | PASS | Independent `/livez`, fail-closed `/readyz`, `/version` and dependency state. |
| Runtime metrics | PASS (service) | Prometheus-compatible readiness, uptime, dependency, build and bounded-cardinality HTTP metrics are exposed. SS-06/VRQGO fleet export/retention certification remains external. |
| Graceful shutdown | PASS | Bounded SIGINT/SIGTERM shutdown. |
| Strict production configuration | PASS | `IRESPOND_ENV=production` fails startup when relational/OIDC/evidence configuration is incomplete. |
| Shared SS-44 Geospatial adapter | PASS (adapter) | Projection broker plus outbox-driven synchronization; production endpoint certification remains external. |
| StratoID/OIDC | PASS (adapter) | Mobile PKCE plus API OIDC/JWKS boundary; production tenant/key-rotation/outage evidence remains external. |
| SS-13 authorization adapter | PASS (adapter) | Fail-closed external policy-decision seam; production policy service certification remains external. |
| SS-03 Redpanda/NATS event backbone | PASS (repository) | Transactional outbox publisher, retry/claim behavior and projection events; production broker topology remains external. |
| SS-18 notification adapter | PASS (adapter) | Tested notification-intent client with tenant/auth/idempotency boundary; production delivery certification remains external. |
| SkyForge deployment package | PASS (repository) | Helm chart, `/livez`/`/readyz`/startup probes, zero-unavailable rollout, PDB, HPA, NetworkPolicy and rendered-manifest assertions. Real SkyForge deployment/canary/rollback remains external. |
| Kubernetes availability/scaling | PASS (repository) | `autoscaling/v2` HPA, stabilization controls, PDB and ingress isolation are rendered and asserted in CI. |
| Service-local API trust boundary | PASS | Request body limit, per-client back-pressure/rate limit, `Retry-After`, request/trace correlation, security headers and HTTP telemetry. SS-07 edge WAF/global rate-limit certification remains external. |
| Repository security boundary | PASS | Secret/private-key, relational/PostGIS-regression, non-root/read-only, auth-bypass and dependency-pin guards. |
| JavaScript dependency reproducibility | PASS | Real `pnpm-lock.yaml`, frozen installs and production advisory audit. |
| Go dependency reproducibility | PASS | `go.sum`, tidy-diff enforcement and `go mod verify`. |
| Vulnerability scanning | PASS | `pnpm audit --prod --audit-level high` plus pinned official `govulncheck`; failures are remediated rather than ignored. |
| Build/runtime supply-chain pinning | PASS | GitHub Actions pinned to immutable commit SHAs; YugabyteDB/RustFS CI images and production Docker bases pinned by digest. |
| Release provenance evidence | PASS (repository) | CI builds all three Linux binaries, packages Helm, records source/toolchain/dependency/base-image metadata, creates checksums and uploads a supply-chain evidence artifact. |
| API route/operation contract | PASS | OpenAPI covers all **51 registered method/path operations**. A permanent source-derived gate rejects missing/stale routes, missing responses, missing operation IDs and duplicate operation IDs. |
| API payload schema conformance | PARTIAL | Core request/response/domain schemas and common errors are documented. Automatic field-by-field runtime/OpenAPI schema conformance remains a separate hardening target. |
| Load/performance evidence | PASS (CI regression baseline) | Real API process + YugabyteDB: 40 needs seeded through HTTP, then 300 nearby-read requests at concurrency 20. Latest green run: 300/300 success, 0 failures, 432.67 req/s, p50 28 ms, p95 131 ms, p99 148 ms. Permanent thresholds are 100% success, p95 ≤ 1 s and throughput ≥ 20 req/s. This is a hosted single-node CI regression baseline, **not** production capacity certification. |
| AppForge build/release handoff | TODO/PARTIAL | Repository produces deterministic binaries/Helm/provenance; AppForge mobile signing, distribution and production release integration remain. |
| Droplet independent release judgment | TODO | Independent final-candidate quality verdict remains required before GA. |

## Canonical data/storage boundary

- **Relational:** YugabyteDB/YSQL is the canonical relational system of record.
- **Object storage:** RustFS is the canonical SS-02 object-storage implementation for iRespond evidence/media data.
- **Client contract:** iRespond uses the standard AWS S3 API/SDK rather than a RustFS- or MinIO-specific application SDK, preserving portability while RustFS remains the platform standard.
- **Evidence integrity:** YugabyteDB owns evidence metadata and the verified SHA-256; RustFS owns object bytes. An upload cannot enter moderation until its stored bytes are verified.
- **Geospatial:** business coordinates may live in YugabyteDB; advanced geocoding/routing/geofencing remains SS-44 rather than a PostGIS dependency.

## Current measurable implementation baseline

The repository metrics job is authoritative. The latest fully green load candidate reported:

- **SOURCE_LOC: 5,409**
- **SOURCE_FILES: 90**
- **MOBILE_SCREENS: 15**

Implemented mobile routes currently include Impact Feed, NeedMap, need reporting/details, evidence, project room/contributions/funding, My Offers/contribution commitments, notifications, Privacy & Data Rights, profile/Impact Passport, safety reporting and sign-in surfaces. Counts should always be taken from the newest green workflow after subsequent changes.

## External / human / provider gates

The following cannot be truthfully completed through repository CI alone:

- production StratoID tenant/client registration, signing-key rotation and outage behavior;
- production Shared Services endpoints, workload identities, credentials and service-to-service authorization;
- production YugabyteDB TLS, multi-zone/regional topology, PITR policy and dated restore drills on the actual service;
- production RustFS multi-node/erasure topology, TLS, replication/durability, lifecycle/retention, upgrades, backup/recovery and failure-domain drills;
- production media malware scanning/transcoding, retention and deletion certification through SS-42;
- production soak, saturation and multi-node performance certification at launch-scale traffic;
- PayCore/payment-provider merchant onboarding, regulated fund movement, refunds, reconciliation and financial controls;
- Apple Developer and Google Play accounts, signing, privacy declarations, review and store approval;
- safeguarding policy approval and trained reviewers for minors/vulnerable people;
- launch-jurisdiction legal/privacy review, terms, community standards and donation rules;
- independent penetration test and remediation evidence;
- real-device accessibility, low-bandwidth and representative device-matrix certification;
- incident response, abuse response and multi-service disaster-recovery exercises;
- production DNS/TLS/CDN/SS-07 gateway and SS-06 observability connectivity;
- real SkyForge staging/production deployment, smoke test, canary and rollback evidence;
- AppForge release/signing/distribution evidence;
- independent Droplet release verdict against the immutable final candidate.

## GA definition

iRespond may be called GA only when every launch-blocking repository-controlled gate is green and every launch-scope external gate has dated evidence, named ownership and an accepted residual-risk record. Missing external evidence is a blocker, not a documentation exception.
