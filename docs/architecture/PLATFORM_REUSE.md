# iRespond platform reuse contract

## Principle

iRespond owns community-action product domains. It must not duplicate mature Stratogroup/NexoCloud platform capabilities where a shared service already exists.

## Canonical integrations

| Concern | Canonical capability | Integration direction |
|---|---|---|
| Relational system of record | Shared Services SS-02 DBaaS / YugabyteDB | YSQL-compatible repositories and migrations; YugabyteDB is the required relational production and CI target. |
| Identity and SSO | Atlasfsp/StratoID + SS-01 identity | OIDC Authorization Code + PKCE for mobile/web; JWT/JWKS validation at APIs. |
| Authorization | SS-13 AuthZ / StratoID governance | Project and institutional permissions should migrate from local role checks to policy decisions with local fail-closed enforcement. |
| Object/media pipeline | SS-42 Media & Asset Pipeline + SS-02 RustFS object storage | RustFS is the canonical object store. iRespond uses the standard AWS S3 API/SDK, owns evidence metadata/checksums/consent/business state, and delegates shared scan/transcode/storage infrastructure through platform contracts. |
| Trust & Safety | SS-43 | iRespond supplies community context, beneficiary consent and moderation policy inputs; shared service supplies review/enforcement infrastructure. |
| Geospatial | SS-44 | Proximity, geocoding, routing and geofencing move behind the shared geospatial contract; YugabyteDB remains relational system of record. |
| Notifications | SS-18 | Push/SMS/voice/OTT delivery; iRespond owns notification intent/preferences. |
| Payments/ledger | SS-22 PayCore | Donations, restricted funds and counterpart funding use licensed payment/ledger integrations; iRespond does not become a bank. |
| Privacy | SS-24 | Consent ledger, purpose tags, DSAR/erasure orchestration. |
| Events | SS-03 Redpanda + NATS | Transactional outbox publishes domain events to the shared bus. |
| Secrets | SS-05 Vault | No production secret values in repository configuration. |
| Observability | SS-06 VRQGO | OTLP traces/metrics/logs and audit indexing. |
| API edge | SS-07 Gateway | TLS, JWT, WAF, rate limiting and route policy. |
| CDN/edge | SS-27 | Public safe media/static delivery after moderation and privacy policy. |
| Build/release | SS-48 AppForge | Mobile/web/API build, signing and distribution pipeline. |
| Independent quality | SS-32 / abiolaogu/Droplet | Independent evidence-based release recommendation and merge blocking. |
| Runtime/deployment | SS-47 / Atlasfsp/NexoCloud-SkyForge | Primary application runtime/deployment target, while preserving portable deployment artifacts. |

## Data boundary

YugabyteDB is the relational system of record for iRespond-owned transactional domains such as needs, verification history, projects, milestones, roles, contribution needs/offers, idempotency records, outbox records and evidence metadata. Specialized shared services may own their own implementation stores, but iRespond must consume them through contracts rather than copying their internal tables.

Evidence object bytes are stored in RustFS through the S3 contract. YugabyteDB stores the evidence business record and the SHA-256 digest bound to the completed object. Completion must verify actual object size and bytes before moderation, and generated evidence object keys are write-once from the application perspective.

Geospatial business coordinates may be stored in YugabyteDB as relational data. Advanced spatial indexing/routing/geocoding is delegated to SS-44 instead of making PostGIS an iRespond production dependency.

## Migration rule

Existing local adapters are development seams. Each replacement with a shared service must preserve the iRespond domain contract, add integration/contract tests, fail closed for security-sensitive capabilities, and avoid a flag day migration.
