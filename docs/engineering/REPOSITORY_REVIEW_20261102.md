# iRespond repository review — 2 November 2026

## Scope and source

Reviewed the release/CI boundaries, Go domain and API paths, YSQL migrations,
RustFS evidence lifecycle, OIDC/SS-13 authority, web/mobile capture and sync,
frontend/API contracts, dependency policy, deployment/recovery scripts and the
complete supplied handoff. Automated repository-wide tests supplement targeted
manual code review; this is not an independent penetration test, exhaustive visual
review or certification of every screen and production dependency.

Source snapshots: original main c12a4b5b8736700c2fdf2739fcd6f9a41c233521;
consolidated feature 49abc513f4e7d8bf04daddd16e7e9cc906b8ec97;
observation repair 8c87f3af676ac866cc318f127b32495c11e42e11;
scoped evidence repair d5342e5053aab66547f820cf3ee1da358736d27d.
Existing untracked `apps/mobile/android/` remains untouched.

Historical source 6484873c8a0c3306a5972247bcc9981da4051bc6 and its certification
references remain separate and unchanged. Its artifact endpoint was previously
unavailable; no new claim of a downloaded/reverified historical archive is made.
The supplied handoff's 82 tests and 48 stories are requirements, not completed work.

## Findings and implemented recommendations

| Priority | Finding | Repair and evidence |
| --- | --- | --- |
| P0 | JSON reporterId permitted attribution to another person; invalid identity silently became a public write | Verified human identity supplies attribution; anonymous reports have no attributed subject; invalid supplied tokens fail closed. Web/mobile send an available bearer token. Real negative tests reproduced the defect. |
| P0 | Retry keys could replay another reporter, memory retries created duplicates, changed payloads were accepted, expired YSQL receipts could not renew | Versioned reporter-scoped keys; 409 for changed intent; serialized memory and bounded transactional YSQL retries; one winning need/outbox event; 24-hour expiry handling. Eight-caller memory and real YSQL tests pass. |
| P0 | Reporters with verifier roles could confirm their own need | Both memory and locked YSQL verification paths reject reporter self-confirmation/audit/rejection; requesting review or disputing remains separate. API returns 403 for conflict of interest. Public need reads withhold the private verified reporter subject without altering authoritative attribution. |
| P1 | Omitted optional SDG tags could violate YSQL NOT NULL | Normalize to an empty list; real database acceptance test passes. |
| P0 | Global reviewer/admin roles did not establish evidence resource scope | Signed tenant claims, canonical syntax validation, fresh SS-13 review/read decisions and fail-closed policy configuration; cross-tenant/admin, forged-header, wrong-resource, revocation and malformed-policy negatives pass. |
| P0 | Restore destination configuration could overwrite the source; equal row counts concealed content mismatch and closing sessions could break cleanup | Restrict to a new scratch database, refuse existing/source destinations, compare row-content SHA-256 manifests and retry owned cleanup without terminating sessions. Five dependency-stub regressions cover refusal, corruption and read failures. |
| P0 | Service review/access calls lacked durable scoped policy proof | Server-supplied human tenant/receipt authority; migration 0012 adds immutable tenant/policy evidence and rejects unscoped new audit inserts; historical scope remains UNKNOWN. Real YSQL/RustFS tests preserve COI, hash, create-only upload and atomic audit/outbox behavior. |
| P1 | Form labels and mobile text contrast/typography defects | PRs #80/#84 repair labels, contrast and readable input text. 33 actual browser route/viewport audits pass, with incomplete findings retained for human review. |
| P1 | Reopening mobile Evidence could overwrite existing attachments with an empty list | PR #82 restores before writes, blocks unsafe writes on restore failure, and supports retry; fresh exported-app regression passes. |
| P0 | Signed service/AI identities inherited human review authority via roles | PR #83 preserves canonical actor type and denies human verification/review to workloads. Production issuer mapping remains an external verification requirement. |
| P1 | Capacity/pilot assumptions could be confused with commitments | PR #81 separates evidence, estimates, hypothetical capacity, unassigned roles and external decisions; institutional templates remain unapproved planning data. |

## Verification and limits

At d5342e5, a fresh Linux Go 1.26.10 `go test -race -count=1 -p 1 ./...`
passes using actual YugabyteDB and RustFS; vet and migration execution twice pass.
The same fresh real-service race suite passed at 8c87f3a. Source archives and hashed
receipts are retained under ignored `build/handoff/`; they are local evidence and
are never published as invented GitHub check statuses.

Local frontend/API/OpenAPI/security/runtime-pin/offline and CI helper checks pass;
mobile TypeScript passes. The 33 browser audits cover 11 initial demo routes at
390×844, 768×1024 and 1440×900. Synthetic records and policy doubles are explicitly
not pilot or live SS-13 evidence. The automated audit retains 33 incomplete findings
for human review and cannot establish WCAG certification. Historical native Android
captures predate these repairs; they are not recertification of the latest source.

Production JavaScript auditing finds zero high/critical, three moderate and one low
finding. Findings are not suppressed. Further compatible remediation still needs
validation; GitHub's default-main alert count describes unmerged main, not this tree.

PRs #77–#86 were merged normally into the feature branch; this does not imply main
acceptance. Main's six required GitHub Actions contexts and strict enforcement are
unchanged. The real consolidated source-monitor run 41498706564 executed checks but
failed mandatory artifact upload at job 125460328353. No upload/check was removed,
no status was forged, and no paid Actions or branch-protection bypass was enabled.

## Remaining risk-ranked work

| Priority | Remaining gap / next implementation boundary | Backlog |
| --- | --- | --- |
| P0 external | Restore free artifact capacity, rerun required checks on the exact accepted feature head, then normal protected merge | GA-04/09 |
| P0 external | Live issuer tenant/actor mapping, explicit SS-13 resource registration, approved service transport/workload identity and negative live policy checks | GA-11, HR-01/04 |
| P0 | Media-type/content validation and SS-42 safety/quarantine, escalation, retention/deletion, location redaction and evidence recall | TR-03/06/07 |
| P1 | Already-issued presigned GET URLs retain a five-minute lease; a fresh policy denial prevents new issuance but cannot revoke an existing URL immediately | TR-06/07 |
| P1 | SQL audit triggers do not protect against a database owner/superuser; production requires separate migration/runtime roles and broker/tenant policy | GA-11, HR-01/04 |
| P1 | Outcome baselines, methodology, feedback, attestations, challenges and maintenance need tenant-safe persistence, APIs and product workflows | IM-01–06, #72 |
| P1 | Ability profiles/consent, opportunity policy, explainable recommendations and application/fulfilment persistence remain incomplete | VO-01–06, #73 |
| P1 | Canonical AICO discovery is complete; typed proposal/delegation/approval/expiry/tool limits and red-team gateway remain incomplete and must stay off | AI-01–05, #73 |
| P1 | Institutional membership/programmes/invites/report/export APIs and Hasura-facing projections need verified tenant boundaries | OS-01–05, #74 |
| P1 | All screen/state flows, keyboard/screen-reader/native accessibility, device recovery, native iOS and physical devices remain unverified | GA-08, HR-02 |
| P1 external | Logical fixture restore verification does not prove physical PITR, production durability/failover or recovery objectives | HR-03, #56/#57 |
| external | Independent security, legal, safeguarding, operations, production topology/signing/deployment and field validation require genuine accountable owner receipts | GA-11, OS-06, HR-04–07 |

Do not expose internal outcome/matching/programme prototypes as complete product
APIs. Preserve Go domain write authority, YugabyteDB/YSQL, RustFS, Expo, StratoID/OIDC
and Shared Services; use the established Authentik/SpiceDB/Hasura/Vault seams rather
than introducing parallel authorities. Do not infer production readiness from a
configured URL or synthetic allow response.

Use `docs/pilot/CAPACITY_AND_DECISIONS.md` for effort ranges and scenario planning.
Human staffing, institution, owner, participant counts and approved dates remain
UNKNOWN/UNCONFIRMED. A real pilot, successful field outcomes, willingness to pay and
independent GA certification cannot be supplied by repository code. `ga=false`.
