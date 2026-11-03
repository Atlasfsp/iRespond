# iRespond API migrations

This directory is the canonical SQL schema evolution boundary for the Go API.

## 0001_core.sql

The initial schema enables PostGIS and establishes durable records for:

- community needs and their verification state;
- geography points indexed with GiST for nearby queries;
- append-oriented verification records;
- idempotency keys for retry-safe mobile writes;
- transactional outbox events for later publication to the event backbone.

## Safety and architecture notes

The existing in-process repository remains the runtime default until the PostgreSQL repository implementation and migration gate are merged. This prevents a partially wired database path from masquerading as production persistence.

The production repository must use parameterized queries, transactions for state transitions plus outbox writes, bounded connection pools, TLS, readiness checks, and explicit data-retention rules for location data.

Local development is available with `infra/local/docker-compose.yml`. The local password is intentionally non-production and must never be reused outside a developer workstation.

## 0011_evidence_review_audit.sql

Adds source-hash-bound independent review decisions and rejects UPDATE/DELETE of
review history. The Go review transaction writes the audit, state and outbox event
atomically. Run migrations before deploying the new service; actorless Go callers
now fail closed. No historical approvals are invented or backfilled. Retain this
additive table on application rollback; pause moderation and roll forward rather
than dropping evidence history. See ADR-003 for remaining SS-13/42/43/24 contracts.
