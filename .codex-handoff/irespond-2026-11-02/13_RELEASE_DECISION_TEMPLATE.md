# Release and Pilot Decision Worksheet — copy per candidate

**All fields are evidence-requiring; blank/unknown means NOT CERTIFIED.**

## Source identity
- Date/time (UTC and operator timezone):
- Repository and branch:
- Source commit / tree SHA:
- Base commit / tree SHA:
- Required PR IDs and exact accepted head:
- GitHub required checks contexts, completion, source run URL:
- Images/packages: digest, Helm chart hash, APK/IPA checksums:
- Historical frozen candidate unchanged? `6484873c8a0c3306a5972247bcc9981da4051bc6`:
- New candidate supersession relation recorded? (never alter frozen artifact):

## QA evidence
| Quality gate | Status PASS/FAIL/BLOCKED/NOT RUN | Immutable run/log reference | Owner/date |
|---|---|---|---|
| Web syntax/canonical source API contracts | | | |
| Expo TS, Metro, runtime + actual devices | | | |
| Go tests, vet, integration and load | | | |
| YugabyteDB migration, TLS, restore | | | |
| RustFS immutable upload, signed GET, deletion/redaction | | | |
| SS-13 denial/tenant isolation | | | |
| SS-42/43 content/safeguarding and incident | | | |
| `pnpm audit` and Go vulnerability scan | | | |
| AICO proposals, injection, user approvals | | | |
| Opt-in volunteer fairness + actual fulfilment | | | |
| Outcome data provenance, missingness and maintenance | | | |
| Institutional programme + permission E2E | | | |
| Privacy/legal and data rights | | | |
| Actual screenshots, accessibility and low bandwidth | | | |
| Rollback/canary/readiness/alerts | | | |

## External certification ledger
| Gate | PASS/BLOCKED/N/A with authority | Evidence link and exact SHA | Approver |
|---|---|---|---|
| StratoID | | | |
| Shared Services SS-13/18/24/42/43/44 | | | |
| YugabyteDB production resilience | | | |
| RustFS production durability | | | |
| AppForge Apple/Google signing | | | |
| SkyForge real deployment/rollback | | | |
| Droplet independent evaluation | | | |
| Independent security/penetration | | | |
| Device accessibility | | | |
| Legal/privacy/safeguarding | | | |
| Operations, on-call, soak | | | |
| PayCore | `N/A` only if officially pledge-only launch scope | | |

## Business/impact evidence
- Pilot organizations/representatives: *private approval refs, no personal info in public file*.
- Participant consent, accessibility, ability profiles:
- Actual submitted/validated reports and denominators:
- Matching offers, accepted, fulfilled, missing data:
- Outputs independently reviewed:
- Outcome indicators and original baselines:
- Data quality and uncertainty:
- Disputes/appeals and unresolved safeguarding:
- Follow-up/maintenance due and overdue:
- Public claims approved by whom:

## Decision — authorize separately
- **Pilot:** GO / NO-GO / CONDITIONALLY GO; scope, owner, date and limitations.
- **Public GA:** GO / NO-GO; exact completed external certification; **default NO-GO**.
- Independent Droplet verdict: `READY | DO_NOT_SHIP | MERGE_BLOCKED | UNKNOWN` and raw evidence; no translation of 409 policy denial into success.
- Residual risks, compensating controls and approval of accountable humans:
- Rollback plan and tested last-known-good digest:
- Date for next review:

**Mandatory note:** A code merge or PR green suite is not AppForge store approval, SkyForge production rollout, Droplet acceptance, or human safeguarding certification. Never set `ga=true` based only on automated repo tests.
