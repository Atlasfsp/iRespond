# iRespond GA Readiness Ledger

Status: **NOT GA — repository-controlled hardening in progress**

This ledger separates work that can be proven in-repository from evidence that requires real provider accounts, production infrastructure, app stores, legal review or human operational drills. A check is not marked complete without evidence.

## Repository-controlled gates

| Gate | State | Evidence / remaining work |
|---|---|---|
| Mobile TypeScript gate | PASS | GitHub Actions `mobile:typecheck` |
| YugabyteDB relational compatibility | PASS | CI boots YugabyteDB/YSQL and executes integration suites |
| Need report + idempotency | PASS | YSQL integration tests |
| Verification lifecycle | PASS | server-authoritative state transitions + history |
| Evidence signed upload | PASS | MinIO/S3-compatible integration test |
| Evidence moderation before access | PASS | pending-review gate + role-protected review |
| Need → Action Project | PASS | confirmed need required |
| Project governance | PASS | roles, milestones, validation, maintenance owner |
| Contribution commitments | PASS | offer/accept/decline/withdraw/fulfil lifecycle |
| Mobile primary workflow | PARTIAL | 10 implemented screens; additional settings/notifications/impact surfaces remain |
| Reproducible repository metrics | PASS | `tools/repo_metrics.sh` |
| Production migration command | PASS | `cmd/migrate`, schema_migrations ledger |
| Non-root API image | PASS | distroless runtime; CI build verification required |
| Readiness/version endpoints | TODO | repository-controlled |
| Graceful shutdown | TODO | repository-controlled |
| Strict production configuration validation | TODO | repository-controlled |
| Shared SS-44 Geospatial adapter | TODO | local Yugabyte-compatible Haversine remains transitional |
| StratoID + SS-13 policy adapter | PARTIAL | OIDC/JWKS exists; shared authorization policy integration remains |
| SS-42 media adapter | PARTIAL | direct S3-compatible dev adapter exists; shared media contract remains |
| SS-43 Trust & Safety adapter | PARTIAL | local moderation state exists; shared review/enforcement integration remains |
| SS-03 Redpanda/NATS outbox publisher | TODO | transactional outbox exists |
| SS-18 notification adapter | TODO | notification intent/delivery integration remains |
| SS-22 PayCore donations/counterpart funding | TODO | financial movement deliberately not implemented locally |
| SS-24 consent/privacy adapter | TODO | DSAR/erasure/purpose ledger integration remains |
| SS-05 Vault secret references | TODO | production secret-broker contract remains |
| SS-06 OTLP observability | TODO | metrics/traces/logs integration remains |
| SS-07 gateway contract/rate limits | TODO | edge policy remains |
| API contract completeness | PARTIAL | OpenAPI exists; needs expansion for all current endpoints |
| Security tests / dependency / secret scans | TODO | GA CI lane remains |
| Load/performance tests | TODO | GA thresholds remain |
| Backup/restore runbook | TODO | YugabyteDB/shared DBaaS operating evidence remains |
| AppForge build/release handoff | TODO | signed mobile/store pipeline requires external signing/app-store setup |
| Droplet independent release judgment | TODO | independent QA evidence remains |
| SkyForge deployment manifests | TODO | runtime packaging and real deployment evidence remain |

## External / human / provider gates

These cannot be truthfully completed from repository CI alone:

- production StratoID/OIDC tenant/client registration and key-rotation drill;
- production Shared Services endpoints, credentials and service-to-service authorization;
- production YugabyteDB topology, TLS, backups, restore drill and regional failure test;
- production object/media storage buckets, malware/scan/transcode integration and retention controls;
- PayCore/payment-provider merchant onboarding, regulated fund flows, refunds and reconciliation;
- Apple Developer and Google Play signing/store accounts, privacy declarations and release approval;
- safeguarding policy approval for minors/vulnerable people and trained operational reviewers;
- legal/privacy review by launch jurisdictions, terms, community standards and donation rules;
- penetration test and remediation evidence;
- real-device accessibility, low-bandwidth and device-matrix certification;
- incident-response, disaster-recovery and abuse-response tabletop/live drills;
- production DNS/TLS/CDN/gateway and observability credentials;
- real SkyForge deployment and rollback evidence;
- independent Droplet release verdict against the final candidate.

## GA definition

iRespond may be called GA only when all repository-controlled blocking gates are green and every launch-scope external gate has dated evidence, named ownership and an accepted residual-risk record. Missing external evidence is a blocker, not a documentation exception.
