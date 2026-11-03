# Fieldwork product and technical review — 3 November 2026

Source baseline: 44b3a8e2c534b5495b057e9ff59011a448ffbe35 (tree shared with consolidated feature f201081). Scope: all Expo route sources, web route handlers, draft/queue/session adapters, Go needs/evidence/project boundaries, API contract, and the prior repository security/release review. This is a source and targeted runtime review, not a claim every screen has passed native or assistive-technology acceptance.

## Product findings and implementation sequence

| Priority | Journey / gap | Recommendation and acceptance |
|---|---|---|
| P1 | Coordinates are visible but no route to intervention | Google Maps / Apple Maps directions on need details, verification and web discovery/submission. Project Room links to source need. Reject missing/out-of-range destinations, accept zero, do not auto-share titles, identity or current location. Provider opens only on explicit tap. |
| P1 | Mobile account profile confuses local position with authority | Show authenticated session subject/roles, sign-in status and sign-out. State that reporter is a report relationship and project roles are resource assignments, not self-selected privileges. Clear stale displayed authority on refresh/error. |
| P1 | Capture is hidden on a second screen, unlimited photos, no video action | Clear report → evidence step; up to four photos and one bounded video; preview/remove, permission failures, local-save/submit status. Retain original bytes and distinguish camera capture from library selection. |
| P1 | No structured per-file time/location provenance | Store client-reported capture context with immutable evidence source metadata; show time/coordinates/accuracy or explicitly unavailable. Metadata is a claim, not attestation. Exact capture location stays within evidence authority; do not put it in public listings/outbox. |
| P1 | Only fixed impact categories | Other with a required bounded description; preserve separately through draft, queue, API, persistence and detail display; do not silently remap unknown historical categories. |
| P1 | Draft references can point to temporary camera files | Copy native attachments to app-private documents, retain while queued, recover drafts before writes. Web preview remains browser-local and must not claim native durability. |
| P1 | Back from evidence can erase attachments on report save | Restore existing draft and preserve attachments while editing fields; do not overwrite evidence with an empty list. |
| P1 | Nearby discovery requires device location | Add manual discovery coordinates/permission-denial fallback; never substitute a fictitious location or label stale results current. |
| P1 | Verification and evidence access require manually entered IDs | Add context links from need detail to verification; retain server COI/policy checks. Build scoped evidence index with provenance/status/appeal actions in a further increment. |
| P1 | Anonymous/offline reporters lack an account-bound submission history | Add a local submission outbox with pending/sync/failure status and server need links; account-bound history needs private actor-scoped API pagination. Do not disclose reporter subjects publicly. |
| P1 | Signed uploads can leave duplicate pending records on retries | Add upload-intent idempotency, resumable transport and expiry/reconciliation; enforce server-side quota and retention by actor/report phase. Client caps alone are not abuse protection. |
| P0 | MIME is claimed, not proven safe; no live scanning/canonical safety service receipt | Validate media signatures/decodability; complete SS-42 quarantine/scanning and revocation integration before broad public access. Existing independent review stays mandatory. |
| P1 | Exact need coordinates are already public | Add a sensitivity classification and policy-aware coarse/public vs authorized exact location contract before sensitive pilots; directions must use only coordinates already available to the caller. Do not introduce hidden precise-location endpoints. |
| P1 | Workspaces have basic forms and permission gates but incomplete delivery experience | Add project member/role ledger, accessible action explanations, task scheduling, intervention evidence by phase, ownership handover, notifications and maintain/repair loops. Server permission envelope remains authoritative. |
| P1 | Impact and matching prototypes are ahead of persisted product contracts | Add tenant-safe baseline/outcome/beneficiary feedback APIs, consented ability persistence, explanation/appeals and accountable approvals. Never equate commitments with measured outcomes. |
| P1 | No complete institutional programme/pilot operations | Scoped onboarding, invitations, consent/safeguarding training, programme reporting/export and data retention need implementation and acceptance. Pilot institution/owner/capacity/dates remain UNKNOWN. |
| P1 | AI workflows not connected to approved external tools | Keep off until canonical AICO role/tool contracts, bounded proposals and human approval receipts are integrated. No AI human-verifier privilege. |
| P1 | Accessibility, localization and recovery need device coverage | Test denied permissions, offline/relaunch, large fonts, keyboard, screen reader, slow uploads and camera/microphone on physical Android/iOS. Automated browser evidence is not native certification. |
| P0 external | Protected main checks remain pending; account billing lock and earlier artifact quota failures | Keep required checks and historical evidence intact; restore authorized free runner/artifact capacity and rerun exact-head checks. A queued check is not an artifact failure or a pass. No paid Actions or admin bypass. |
| P0 external | Production signing, live identity/policy/storage topology and external certification unresolved | Require verifiable owner receipts. Debug demo APK is not a production release; ga=false. |

## Map integration contract

Use documented HTTPS links with only destination coordinates. Google: https://developers.google.com/maps/documentation/urls/get-started ; Apple: https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html . Native apps or the provider website handle directions. Embedded turn-by-turn navigation, offline map downloads and route safety assessment are not provided. No map API key or paid routing service is introduced.

## Evidence and release tracking

Implementation commits and test receipts are recorded alongside each completed increment. Original untracked Android files, historical GA source/evidence and original APKs remain untouched. New work targets the existing feature PR; merging into that branch does not mean main acceptance or GA certification. Remaining rows above are a prioritized engineering backlog, not completed work.

Additional API review found that omitted/null creation coordinates silently decoded to (0,0), and nearby queries admitted NaN/Inf. Creation now requires both coordinate fields explicitly (actual zero remains valid), nearby queries reject non-finite inputs, and report text/body sizes are bounded. Verification web refresh no longer uses an expired asynchronous Event.currentTarget.

## Implemented in this increment

- Destination-only Google/Apple directions from need details, verification, discovery and submission; a Project Room links to its source need. Invalid/missing destinations stay disabled, historical NULL locations have an explicit `locationKnown=false` flag, and real zero coordinates remain valid. Coordinates can be selected/copied from need details. This launches the selected provider; it is not embedded turn-by-turn navigation.
- Signed-in account identity/roles, sign-out and accepted **project-specific** role labels from the server's actor-scoped query. Local community position never grants a role. Account/workspace/project authority refreshes on focus; stale need/project records clear while replacements load. Need-detail verification links carry the concrete need ID.
- Other impact category with required bounded description, draft restoration, queue transport, YSQL persistence and detail display. Report location source/time/accuracy/confirmation persist privately; public responses and events do not expose the location context.
- Four photos plus one video per reporter per need, enforced both by the interface and serialized server transactions. Photos ≤10 MB, video ≤25 MB. Camera capture requests a maximum 30 seconds; API duration is explicitly a client claim until independent decoding/scanning exists. Before/during/after labels and UTC capture/attachment timestamps, coordinates/accuracy or denied/unavailable labels appear with the preview. Originals supplied by the picker are retained separately from the visible stamp; no burned-in export or forensic attestation is claimed.
- Photo capture/library selection, video recording/library selection, removal, recovery guards and inline error feedback. Video previews use Expo Video 2.2.2 inside the app. This adds a native dependency: **the previously delivered APK is not updated and must not be hotpatched with the new JavaScript bundle**. A fresh Android/iOS native build and device acceptance are required.
- Native attachments copy into app-private documents. Successful sync removes only allowlisted app-owned copies after the durable queue update and reference checks; picker originals and queued/draft references stay protected. Browser data-URI drafts remain subject to browser storage quota; failure is visible and does not claim durable saving.
- Device submission outbox, retry reasons and the last 100 successful device receipts with need/directions links. These are not a complete account-wide history. Stable draft submission keys prevent duplicate enqueue after cleanup/retry failure. Browser submission no longer depends on native-only alert callbacks.
- File upload IDs scoped to authenticated uploader + need, bound to SHA-256 and immutable capture context. Lost PUT responses can complete a create-only object; completed transport is acknowledged without another PUT. Conflicting intent is rejected and quota failures retain the local attachment. Media container headers are checked before moderation; safety scanning remains independent.
- Explicit coordinate fields, non-finite query rejection, bounded report bodies/text, and a corrected async web verification refresh. Local test files run with configurable bounded concurrency rather than overloading the laptop; all assertions remain enabled.

## Remaining priorities and relative effort

These are engineering estimates, not committed staffing or dates. Human capacity, institutional partner/owner, participants and pilot dates remain UNKNOWN/UNCONFIRMED. The original 90-day programme remains relative.

| Next priority | Repository work / acceptance boundary | Estimated effort | External dependency |
|---|---|---|---|
| P0 | Scoped evidence index and reviewer UI with provenance/status, protected previews and escalation; no manual evidence-ID copying | 3–6 engineering days | Live SS-13 resource policy acceptance |
| P0 | SS-42 media decoding/scanning, trustworthy video-duration extraction, quarantine/recall and operational retention/erasure | 5–10 engineering days after contract discovery | Registered scanner, policy and retention owners |
| P1 | Complete account-scoped report history and recoverable upload-intent cancellation/reconciliation, including identity changes after uncertain responses | 3–6 engineering days | Confirmed account/privacy lifecycle |
| P1 | Sensitivity classification and coarse public vs authorized exact location; consent/access audit | 4–8 engineering days | Safeguarding/data-protection decisions |
| P1 | Browser IndexedDB attachment storage, resumable upload transport, orphan reconciliation and storage-pressure recovery | 3–6 engineering days | Device/browser acceptance |
| P1 | Fresh native build, camera/microphone/GPS/offline/relaunch tests, large text, VoiceOver/TalkBack and physical-device review | 3–5 engineering days | Compatible device access and signing/release owner |
| P1 | Project task/member ledger, phase-specific intervention evidence, maintenance ownership and outcome feedback | 8–15 engineering days | Accountable programme/pilot decisions |
| P1 | Persisted impact measurement, consented matching, canonical AICO proposal/approval gateway and institutional reporting | Follow the existing engineering handoff as separate domain increments; not a single UI patch | Canonical shared-service contracts and accountable human approvals |
| Release | Exact-head protected CI, evidence uploads, manual refresh, live identity/policy and independent certifications | Owner-dependent; no calendar promise | Free artifact capacity, independent gate owners; ga=false |

## Verification scope

New policy and upload-retry fixtures use synthetic media and isolated dependencies; their results are not field evidence. Browser checks cover Google/Apple links, zero coordinates, custom category recovery, account/project role display, photo/video controls, four-photo removal, submission history and draft corruption recovery. Native module registration is checked from the actual autolinking graph, which does not prove runtime behavior on a phone. YSQL/RustFS integration checks cover immutable metadata, hash/source binding, concurrent upload intent/quota behavior, independent review and actor-scoped project assignments. Exact source commits, command receipts and retained failed attempts are recorded in the local verification ledger. The first full database run was invalidated by overlapping test migrations; subsequent acceptance must run serially against isolated fixtures. Disk/runtime failures are retained rather than relabeled as passing CI.

Dependency follow-up: PR #91 merged compatible stable Go updates after a second complete race suite, vet, module verification and Darwin/Linux ARM64 scans. See `../engineering/DEPENDENCY_REVIEW_20261103.md` and the execution ledger. Physical-device acceptance remains pending; the test checklist is `../frontend/NATIVE_FIELD_ACCEPTANCE.md`.
