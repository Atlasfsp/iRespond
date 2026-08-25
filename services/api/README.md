# iRespond API

The API serves the mobile-first community action product. Set `DATABASE_URL` to a PostgreSQL/PostGIS database initialized with `migrations/0001_core.sql` to enable durable persistence. Without `DATABASE_URL`, the service uses an explicitly volatile in-memory repository for local development and unit tests.

Mobile retryable writes should send an `Idempotency-Key`. Verification transitions are server-authoritative and currently require `X-Actor-ID` until the authentication/session slice replaces the provisional actor header.
