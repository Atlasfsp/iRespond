# Platform evolution and shared-service boundaries

Date: 2026-11-02. Status: accepted implementation direction; external integrations pending.

## Decision

Apply BAC engineering doctrine to Horizon/FIELDWORK and the six capability bundles.
Use XP increments, test-first domain rules (TDD), explicit bounded contexts (DDD),
and AI-assisted engineering with human-reviewed evidence (AIDD). Product proposals
are not authorization to fabricate service connections or production certification.

The Community, ImpactOS, Action Intelligence, Trust Registry, Volunteer Cloud and
Resilience experiences share one domain platform. Preserve the pledge-only release.
No money movement, independent certification, institutional pilot success or UN
recognition is implied by source-level work.

## Authoritative integration contracts

| Concern | Target | Migration contract |
| --- | --- | --- |
| Product database access | Hasura | All new product-facing reads/writes use tenant-scoped Hasura queries/actions; existing Go REST routes are legacy adapters until migrated. Never expose database credentials to clients. |
| Transactional domains | YugabyteDB | Needs, projects, programmes, memberships, measurements and transactional outbox; tenant keys mandatory on new aggregates. |
| Other database workloads | ScyllaDB, TiDB, MongoDB, DragonflyDB | Add only for an evidenced workload; no redundant copies of authoritative project state. |
| Authentication | Authentik | Standards-based OIDC issuer/client configuration; existing StratoID naming is legacy. Validate issuer, audience and signatures. |
| Authorization | SpiceDB | Tenant and resource checks at every Hasura action/Go command boundary; never trust client roles or a tenant identifier alone. |
| Secrets | Vault/KMS | Runtime secret references; no long-lived runner or service secrets in source. |
| Regional events | NATS JetStream | Transactional outbox, event ID, tenant, schema version, trace context, idempotent consumer. |
| Inter-regional events | Redpanda + Connect + Console | Contract adapter, data residency filtering, replay and deletion propagation. |
| Search | Meilisearch / Qdrant | Authorized projections only; delete/revoke projections when evidence visibility or consent changes. |
| Audit/compliance | OpenObserve + ClickHouse | Append-only review/event history, retention and subject minimization; keep sensitive evidence out of logs. |
| Observability | OpenTelemetry everywhere | VQRGO for SaaS/PaaS and VictoriaStack for IaaS; trace external calls, errors, latency and proposal acceptance without raw PII. |

First-wave services may be per-platform. Configure endpoints, credentials, tenant
mapping and capability versions outside the domain so adapters can move to shared
hosted services without changing domain rules. Do not introduce additional database
engines merely to populate this matrix.

## Bounded contexts and acceptance

- **Impact Intelligence:** goals, baselines, outputs, outcomes, feedback, maintenance,
  reviewer attestations and challenges. Internal outcome rules now reject unreviewed,
  self-reviewed, non-finite, future-dated and private publication. Product exposure
  still needs persistence, authenticated Hasura actions, evidence ownership checks,
  immutable review history, consent/retention propagation and cross-tenant E2E tests.
- **Volunteer Cloud / Action Intelligence:** opt-in skills, time and coarse-area
  preferences. Deterministic fallback produces sourced proposals requiring human
  approval. No exact coordinates or sensitive traits enter ranking. AICO remains
  disconnected pending a versioned contract, tool allowlist, kill switch, bounded
  cost/latency, injection testing and telemetry.
- **ImpactOS:** tenant, institution, membership, programme and project associations.
  Membership must originate in authenticated identity plus SpiceDB, never user input.
  Invitation acceptance, role changes and assignments require audited commands.
- **Trust Registry:** immutable content hashes and review history; no C2PA claim until
  a real validator is integrated. Missing credentials do not establish falsity.
- **Resilience:** privacy-preserving incident triage and human escalation. Never
  advertise emergency dispatch or delivery guarantees without an accountable partner.

## Threat model delta

| Threat | Required control / negative test |
| --- | --- |
| Fabricated needs / duplicate evidence | Content-hash checks, review before promotion, community challenge, duplicate-safe writes |
| AI-generated or manipulated media | Provenance marked unknown/generated; independent review; no automatic authenticity claim |
| Tenant spoofing | Derive tenant from authenticated membership; reject cross-tenant reads, invites, evidence links and exports |
| Self-attested impact | Independent authorized reviewer; retain method, source, date, uncertainty and attribution limits |
| Sensitive beneficiary disclosure | Redacted projections; no precise location/model input by default; consent and retention enforcement |
| Prompt injection | Treat need/evidence text as data; no role, spending, eligibility, safety or outreach authority for agents |
| Public-PR runner compromise | Dedicated isolated ephemeral Linux runner, no host shares/SSH agent/secrets, trusted source restriction, deletion after job |

## Release sequence

1. Finish dependency and frontend checks and restore genuine required CI for #71.
2. Complete Hasura/Authentik/SpiceDB contract wiring and tenant negative tests before
   exposing institutional, measurement or AI writes.
3. Pilot one NGO/foundation programme: safe-water maintenance is a candidate hypothesis,
   not a selected partner or executed pilot. Capture denominator, period, source,
   missing data and community feedback for every metric.
4. Complete #53 external signing, physical devices, accessibility, security, privacy
   and operational gates against a new exact source SHA. Keep GA false.

Existing frozen certification evidence must never be relabeled for a new commit.
