# Engineering handoff execution ledger

Baseline: e90b95b3ed371b5b9774e83a04aa0982fe619f86. Full supplied package is
preserved unchanged in `.codex-handoff/irespond-2026-11-02/`. All 15 listed SHA-256
checksums match; numbered source documents match the consolidated master. The
supplied duplicate master downloads do not represent independent evidence.

## Sequential execution

| Prompt | Status | Evidence / next dependency |
| --- | --- | --- |
| 0 Discovery | implemented | `build/handoff/baseline.json` and repo-inventory.md; existing untracked Android work preserved |
| 1 Runner/governance | implemented, merge blocked externally | Real isolated smoke and genuine e90b95b jobs; `docs/release/MACBOOK_CI_20261102.md`; task VM removed |
| 2 Dependencies | partial | e90b95b supply-chain validation: 0 high/critical JS, 3 moderate/1 low; Go 1.26.10 negative reachable scan. Upload quota blocks job; #76 remains open |
| 3 UI/merge | partial | Web/mobile/API/security/deployment pass e90b95b; native Android emulator evidence; quota blocks required supply-chain/source-monitor. Full screen/state and iOS/assistive-tech acceptance remains |
| 4 Trust | next implementation | ADR-003, independent review and immutable source lineage; real DB/storage negatives required |
| 5 Impact | not implemented as a product API | Internal outcome prototype exists; requires persistence, methods, policy, outbox and safe projections |
| 6 Volunteer | not implemented as a product API | Internal deterministic matcher exists; requires self-owned consent profiles, concurrency-safe applications and canonical commitment mapping |
| 7 AICO | discovery pending | Discover canonical contract; no invented endpoint, provider call or live registry claim; off by default |
| 8 Institutions | not implemented as a product API | Internal invitation prototype exists; requires verified tenant membership and programme/task/report contracts |
| 9 Packaging | proposal only | One shared domain/identity; no endorsement, outreach or commercial claims |
| 10 Quality | partial baseline only | Exact-source local and e90b95b CI evidence exists; 82 new matrix requirements are not all passed |
| 11 Roadmap | dependency plan supplied, execution ongoing | No confirmed human staffing or pilot; horizon is not elapsed work |
| 12 Integration/verdict | blocked | PR #71 remains OPEN; no accepted new main candidate, pilot or external GA certification |

## Risk-ranked gaps

1. P0: external GA production/signing/security/legal/safeguarding gates pending.
   Preserve frozen candidate and all evidence. Owner: canonical gate owners in
   `config/ga/external-gates.json`; no implementation can synthesize approval.
2. P0: storage quota blocks required artifact uploads and protected merge. Owner:
   GitHub organization/account administrator. Retain prior certification artifacts;
   restore available free quota, await recalculation and rerun the failed checks.
3. P0: current evidence review service lacks authenticated actor separation and a
   durable review/audit record. Next code slice must close uploader/reporter COI,
   protect resource scope and transact decisions with outbox events.
4. P0: new domains currently lack tenant-aware persistence and public authorization.
   Do not expose prototypes through UI or fabricate live integrations.
5. P1: authenticated live-data, 91-screen/state, physical-device, native iOS and
   independent accessibility evidence incomplete.
6. P1: no confirmed pilot institution, trained reviewers, consenting participants,
   staff availability or approved methodology. Pilot metrics remain UNKNOWN.

## Capacity and milestones

Use the supplied dependency network: baseline → trust/tenancy → measurement and
matching → AICO → institution workflow → consented pilot → candidate → independent
certification. Work in narrow PRs with real tests. Scope and dates are not promises
of human availability. Follow `08_90_DAY_EXECUTION_PLAN.md` milestones M0–M8;
record actual deltas in `build/handoff/daily/` and an evidence-bearing copy of the
acceptance CSV rather than changing the original package's NOT_RUN rows.

The user authorizes preserving Go, YugabyteDB/YSQL, RustFS, Expo, StratoID/OIDC,
Shared Services and release seams. BAC Authentik/SpiceDB/Hasura standardization
remains behind those established service contracts; it does not authorize a
parallel identity/data plane or silently replacing release architecture.
