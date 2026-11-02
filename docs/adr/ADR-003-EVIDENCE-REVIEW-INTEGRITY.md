# ADR-003: source-bound independent evidence decisions

Status: implementation proposed; independent Trust/Safety approval pending.
Date: 2026-11-02. Related: #58, #60, #72.

## Decision and scope

Keep RustFS create-only keys, streamed SHA-256 completion and moderation-before-read
unchanged. Require the OIDC-authenticated reviewer principal inside the Go evidence
service, as well as the HTTP role check. Reject uploader and original need reporter
for all review decisions. Actorless internal callers fail closed.

Migration 0011 adds private `evidence_reviews`: the real stored digest, authenticated
reviewer, previous state, decision, timestamp and intent key. Review, audit insertion
and the `evidence.reviewed` outbox event share one YSQL transaction. Row locking,
bounded serialization/deadlock retry and a stable intent prevent competing/repeated
decisions from duplicating effects. Intent reuse for another decision is a conflict.
Database triggers reject audit UPDATE/DELETE and source-metadata relinking/digest
mutation after completion; correction must be a separate future
append-only event, not rewriting history. No model or client supplies reviewer IDs.

Existing HTTP decision payloads stay compatible. `Idempotency-Key` is recommended;
legacy clients receive a deterministic server-derived review intent. No new public
provenance API, C2PA parser, institutional privilege or approval UI is enabled in this
slice. This security invariant is mandatory rather than a flag that allows self-review.
Optional future provenance/AI/institution features remain off pending contracts.

Existing available evidence is not backfilled with fictional reviewers. Historical
moderation remains historical; the migration does not claim new SS-42 approval.
The safe response shape stays unchanged and the outbox contains only evidence/review
IDs and a state: no private notes, reviewer identity, coordinates or object URL.

## Threat model and unresolved controls

| Threat | Existing / this slice | Remaining control and owner |
| --- | --- | --- |
| Byte overwrite and declared hash fraud | Create-only PUT, streamed readback; audit binds actual digest | Production RustFS durability/retention certification (#57/#58) |
| Self-review and collusion | Uploader/reporter rejected, authenticated role required, private immutable audit | Related-party/beneficiary COI and reviewer roster governance: Trust/Safety |
| Replay, parallel decisions, partial event write | Row lock, stable intent, atomic outbox/audit; negative integration tests | Broker replay/consumer scope and operational recovery drills |
| Synthetic/context/location fraud | Byte integrity never labels content true | Independent corroboration, field review, consent and trained reviewers |
| Malware/type confusion | Pending objects cannot obtain an approved signed read | SS-42 scan/quarantine, MIME/polyglot and parser sandbox certification (#58) |
| Tenant/resource access | Existing reviewer-role boundary preserved; no institutional APIs added | Resource-scoped SS-13 decisions and future tenant predicates; role alone must not grant an institution resource |
| Vulnerable identities/exact locations | No sensitive data in new response/event fields | Safe derived previews, redacted exports/search/AI and location policy (#63) |
| Prompt injection | This slice calls no agent and executes no uploaded instructions | Proposal-only AICO allowlist and adversarial fixtures before integration |
| C2PA misrepresentation | No parser or metadata-as-truth claims | Optional verified provenance signal, absent/invalid/unknown distinct, independently reviewed |
| Deletion vs immutable audit | Audit cannot be silently modified or cascaded away | SS-24/legal retention, pseudonymization and lawful access revocation; no promise of instant backup purge |
| Pledge or output inflation | No finance, impact or passport mutation | Pledge-only boundary; separate measured outcomes and approved methods |
| Production/source identity confusion | Additive feature branch and exact-source evidence | Protected merge and external certification; ga=false |

The presence of a digest or human decision is not media-safety certification or proof
that a depicted event happened. No external gate passes because this ADR exists.

## Migration and rollback

Run the canonical migration command before deploying the new binary. 0011 is ordered,
additive and repeatable; original evidence IDs/bytes/digests are unchanged. It creates
no fabricated historical rows. Apply twice and run real YSQL/RustFS tests before merge.

On a defect, pause moderation writes using the authorized gateway policy and roll
forward the service. Retain the audit table, source objects and outbox. Do not drop
history to make an old binary work or silently roll back to actorless moderation.
Historical evidence remains readable only under its existing authorized access policy;
new audit records are private and have no public list/export endpoint.

## Acceptance evidence

Negative tests precede release: actorless/unprivileged calls, uploader/reporter COI,
intent conflict, audit mutation, concurrent duplicate review and outbox failure.
Retain RustFS overwrite/hash-mismatch and moderation access tests. Test results and
source identity belong in `build/handoff/`; pending integration or human certification
must remain explicitly NOT RUN/BLOCKED rather than inferred from unit tests.
