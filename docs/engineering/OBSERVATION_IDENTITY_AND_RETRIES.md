# Observation identity and retry integrity

Need creation accepts anonymous observations, which remain unattributed. JSON
`reporterId` is retained as a deprecated compatibility field and ignored. Supplying
an Authorization header requires valid OIDC verification; the signed human subject
becomes the reporter. Invalid tokens do not silently fall back to anonymous access.
Signed AI/service identities cannot publish observations through this path. Public
anonymous reporting still requires abuse monitoring and does not establish identity
or verified fact; it is not an AI proposal approval workflow.

Web and mobile attach an available session bearer token. Mobile no longer claims a
locally generated actor ID as the reporter. The existing evidence upload and review
boundaries remain separate from need verification.

Retry receipts use a versioned SHA-256 namespace containing the verified reporter
(or explicit anonymous scope) and the client key. Identical requests replay the
original response; another payload under the same key returns 409. In-memory and
YSQL stores serialize/retry concurrent creation, preserving one need and one YSQL
outbox event. Expired 24-hour receipts may be replaced; original needs and audit
records remain. Omitted optional SDG tags are persisted as an empty list.

## Candidate deployment consideration

The v2 namespace deliberately does not trust old body-attributed retry receipts.
Before deploying this new candidate, account for any pre-v2 queued requests that
already created a need but lost its server ID. Drain/reconcile those legacy keys
through an approved deployment plan; do not silently relabel old records or claim
historical provenance is repaired. No production migration or deployment is performed
by this source change. The frozen historical candidate is unchanged.

Tests reproduce forged attribution, invalid-token fallback, workload publication,
cross-reporter retry replay, eight concurrent memory creations, YSQL changed-intent
acceptance and expired-key failure. Real YSQL tests cover concurrent retry and
single-event integrity. Synthetic mobile module tests exercise the actual sync code
with isolated storage/session/network doubles; they are not device or pilot evidence.
