# Trust, Evidence Integrity, Community Safety and Provenance — Engineering Pack

**Priority:** P1. **Tracked by:** GA #53, external SS-42 #58, SS-43 shared services, proposed ADR-003, Impact Intelligence #72. **Existing foundation:** `internal/evidence`, `internal/safety`, `internal/needs`, `internal/privacy`, `internal/auth`, RustFS, YugabyteDB.

## Problem statement
AI-generated imagery, misleading location/context, duplicate submissions, collusive review and fake programme claims can undermine humanitarian credibility. Treat an uploaded image, narrative or GPS coordinate as **reported information**, not proof of truth. Evidence integrity must preserve bytes and audit decisions while also protecting survivors, vulnerable people and confidential reporters.

## Existing guarantees to preserve
- Pre-signed **create-only** RustFS uploads using standard AWS S3 SDK; evidence can have SHA-256 byte verification after completion; mismatched object is rejected.
- Status-based moderation before signed download and access; permission check cannot be bypassed by knowing an ID.
- YSQL storage; privilege separation for verification transitions; signed access only after appropriate approval.
- Confidential safeguarding case workflow, appeals and audit; SS-42/SS-43 external production certification still outstanding.
- Data access/export/correction/deletion request workflow and recorded consent.

## Threat register and responses
| Threat | Attack pattern | Proposed response | Must not do |
|---|---|---|---|
| Synthetic/disinformation media | generated flood imagery or altered document | provenance parse + independent corroboration + reviewer | assume AI detection is definitive |
| Location spoofing | image from elsewhere or GPS spoof | coarse public point, suspicious flag, on-site reviewer | publish precise vulnerable-site coordinates |
| Collusion | a reporter self-reviews or coordinated friends confirm | role separation, conflict of interest, reviewer audit | allow self-attestation to count as independent verification |
| Evidence overwrite | re-upload after approval | write-once object key, digest match and version binding | replace object bytes in place |
| Reuse/double count | same media for multiple needs | similarity hints and human case linkage, hash dedupe within lawful scope | delete legitimate duplicates automatically |
| Malware/media exploit | encoded exploit in photo/PDF/video | quarantine, content/mime checks and SS-42 scan | publicly serve pending media |
| Doxxing/targeting | public child/beneficiary faces or exact locations | safety labels, consent, redaction, private reviewer envelope | grant AI access to precise location by default |
| Prompt injection | malicious text on uploaded flyer | treat file as untrusted data, tool/response boundary | allow model instructions from evidence to trigger writes |
| Evidence exfiltration | scraped signed URLs or guessed IDs | short expiry, scoped auth, no secrets in events/logs | share direct RustFS credentials with clients/AI |
| Deletion conflict | retention law vs user request | documented legal hold, cryptographic access revocation, retention status | promise full deletion of immutable backups immediately |
| Fraudulent funding | claim pledge == received money | pledge state explicit, no payment status inferred | issue fictitious receipts |
| Misleading outcomes | outputs presented as attributable durable change | measurement grades, reviewer, caveat | invent universal impact score |

## Proposed schema: `evidence_provenance`
Before authoring a migration, inspect existing `evidence`/`need_evidence` columns. Use an additive table or columns with no duplicate authority:

- `evidence_id` FK to existing evidence ID, `tenant_id` or authorized project scope.
- `object_sha256_hex` (only computed from actual stored bytes), `byte_size`, `media_type`, `original_object_version_id` where RustFS supports it.
- `capture_claims_json` (EXIF/C2PA/submitter claim; quarantine personal fields), `capture_trust_level` enum **claim_only / device_attested / third_party_attested / unknown**. Neither establishes content truth.
- `c2pa_status` enum `not_checked`, `absent`, `valid_signature`, `invalid_signature`, `unsupported`, `parse_error`; `c2pa_manifest_hash`, validation timestamp and verifier version.
- `scan_status` pending/clean/quarantined/blocked; `scan_refs` nonpublic; `review_status` pending/approved/restricted/rejected; `reviewer_id`, COI declaration and reason.
- `redaction_policy_id`, `public_preview_id`, retention/legal_hold and deletion_state; avoid mutating original byte hash.
- Append-only `evidence_reviews`, `evidence_challenges`, `evidence_audit_events` with actor, action, prior/new state, reason, timestamp, safe metadata, outbox event ID.

Never expose private policy/evidence scan results through a public `GET` or AICO tool. Use a safe server-generated public projection with explicit approved fields.

## C2PA contract — modest by design
1. Optional ingestion of Content Credentials; verify signature against configured trust store and policy where supported.
2. Store both verification **result** and parser limitations; treat unknown/missing credentials neutrally.
3. Display “Content provenance information available” only for actual verified metadata; never “photo verified true.”
4. Make provenance portable via stable content hash and signed attestations, **without publishing contributor identities** unless consented.
5. Retain independent verification: cross-source review, site visit, expertise, community challenge and evidence lineage.
6. Sandbox parsers and cap CPU/memory/file sizes; fuzz malformed manifests and decompression bombs.

**Primary source:** C2PA 2.2 explainer explicitly warns that provenance cannot establish whether media depicts truth: https://spec.c2pa.org/specifications/specifications/2.2/explainer/_attachments/Explainer.pdf

## Human review workflow
```
observed evidence → upload initiated → uploaded/completed → hash-integrity verified
  → media quarantined + SS-42 scanning → reviewer queue → approval/restriction/rejection
  → request for clarification or appeal → signed limited access → follow-up and retention
```
- Require independent reviewer role and conflict check for material confirmations; avoid same person submitting and approving.
- High-risk humanitarian/safeguarding report: immediately restrict public visibility and notify trained trust staff, not a public feed.
- Record state transition with idempotency and outbox; restore consistency on outbox replay.
- Community challenges should be low friction but rate-limited against harassment; distinguish genuine feedback from verified findings.
- Provide protected appeal and correction rights; audit reviewer decisions and publication/withdrawal.

## Location and identity privacy
- Allow a reporter to confirm an intervention coordinate accurately while using a separate **public display location** policy, such as ward/city area. High-risk location never enters public API, logs, AI prompt or push notification.
- For minors, survivors and emergency shelters, never publish precise addresses or sensitive faces by default. Mask metadata such as EXIF GPS in public previews without modifying original forensic evidence record.
- Audit scopes at institution, programme and project level; revoke links when evidence moderation state changes; default access denied if SS-13 unavailable.
- Ensure deletion/consent withdrawal propagates across cached thumbnails, search index, exported reports and relevant AICO retrieval index, subject to legal retention rules.

## Tests and adversarial fixtures
- `CreateOnlyUpload`: second PUT cannot overwrite approved source; digest invariant remains stable under parallel retry.
- `HashMismatch`: declared digest != RustFS bytes; fail upload completion and prevent moderation/download.
- `UnauthorizedSignedRead`: no signed URL for unauthenticated/insufficient role, even if ID known.
- `CrossTenantEvidence`: org A cannot read/review organization B evidence (also SS-13 unavailable fail closed).
- `ReviewerSeparation`: reporter cannot independently audit own evidence; invalid state transition fails.
- `C2PAAbsent`: remains UNKNOWN, never rejected solely for missing credentials.
- `C2PAInvalid`: flag signature invalid without asserting content false.
- `SyntheticMedia`: label as suspicion pending human review; no automated punitive action.
- `LocationLeak`: search/export/notification/AI request never expose original high-risk coordinates.
- `DeleteCascade`: affected person requests deletion; propagates through derived material consistent with legal hold.
- `PrivacyBackups`: audit no false promise of immediate purge from immutable backups.
- `MediaMalware`: quarantine, no public access, manual escalation.
- `AppealAndDispute`: append-only corrections and publication state changes, duplicates idempotent.
- `TaintedFileInjection`: uploaded text instructs agent to send credentials; no tool execution.

## Deliverables and acceptance
- ADR and threat model; DB migration with data backfill plan; Go service adapters and OpenAPI docs; SS-42 integration contracts; human reviewer UI; redaction policy; outbox events; logs/metrics; replay and safety tests; accessible mobile/web statuses; rollback runbook.
- **Exit gate:** real RustFS integration, complete byte lineage, unauthorized access blocked, no privacy leak, human reviewed case, independent review and appeals demonstrated; vulnerability scan/pen test evidence recorded. External SS-42/43 certification remains pending even if these tests pass.

## Codex execution prompt
> Inspect current RustFS evidence service, safety/consent endpoints and migrations. Author ADR-003 and a threat model with the attack cases above. Implement the smallest additive provenance and review slice using Go, YSQL, SS-13, SS-42/43 and the transactional outbox; preserve immutable SHA-256 upload binding. Write adversarial integration tests before any public UI; add optional C2PA only if supported safely. Never equate C2PA metadata with factual truth and never expose exact vulnerable-person locations. Keep fields and endpoints feature-flagged; show evidence-quality labels only from actual server records. Open a narrow PR and report the independent production gate status without marking it PASS.
