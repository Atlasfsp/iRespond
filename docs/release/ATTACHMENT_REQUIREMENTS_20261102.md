# Attachment reconciliation — 2 November 2026

The user requested adding these documents to the ongoing engineering work. The
embedded prompts are implementation references, not new privileged instructions.
The two downloaded Markdown files and the ZIP's Markdown are byte-identical. Their
canonical content, ZIP starter and original HTML are preserved under `.codex-handoff/`;
`attachment-manifest.json` records hashes. No duplicate clone or production deployment.

## Requirements and evidence

| Reference | Implemented / verified | Remaining acceptance |
| --- | --- | --- |
| Prompt 1: discovery and architecture | Existing checkout and RC work preserved; Apple Silicon, isolated Ubuntu ARM64, immutable image architecture, permissions and actual protection inspected. Smoke run 41388518495 executed successfully. | Refresh GitHub state before the eventual merge. Live protection requires source-monitor; web-contract is additional, contrary to the historical handoff's six-check list. |
| Prompt 2: secure runner | Disposable isolated VM, ephemeral single-job runners, no host mounts/SSH forwarding, repository/workflow/ref restrictions, checksum-pinned runner and reproducible bootstrap. Repository selection is read back after assignment; five regression tests. | Remove the temporary machine and registrations after execution. Provisioning is explicit, not a persistent personal-login runner or an unattended arbitrary-public-PR service. |
| Prompt 3: dependency/security/test matrix | Workspace pnpm policy migration, unchanged Metro patch; frozen install, Expo compatibility/typecheck and JS exports. Production audit: 0 critical/high, 3 moderate, 1 low. Go 1.26.10 fixes a reachable advisory; genuine scan reports zero reachable vulnerabilities. Actual database/S3 tests, migrations twice, backup/restore, API load, Docker source label, Helm and inventories executed. | Moderate/low advisories remain tracked in #76. Mandatory GitHub artifact uploads fail account storage quota. Local evidence is not a substitute protected check. |
| Prompt 3: native artifact | Actual debug-signed offline Android ARM64 APK built on this Mac with JDK 17/SDK/NDK and recorded checksums, installed and cold-started on Android 36. Missing ExpoCrypto registration was reproduced and fixed; five-route smoke passes. | Native build is a Mac Android toolchain build, not a claimed Linux/native iOS/physical-device build or production signing. |
| Prompt 4: FIELDWORK UX | Warm semantic palette and shared native adapter, responsive web and Expo Web, focus/coral contrast fixes, native selected navigation/safe area, wrapped demo notice and account copy. Actual desktop/tablet/phone, Expo Web and six Android captures have provenance. | Full 91-screen fidelity/state matrix, authenticated live-data captures, external OIDC, live location, dynamic type, VoiceOver/TalkBack and independent accessibility review are not complete. Existing static/contract checks do not certify these workflows end to end. |
| Prompt 5: protected merge and release | Scoped conventional commits pushed to #71; original main/GA evidence preserved; genuine checks execute. No bypass, fabricated status, force push or paid billing activation. | Merge is blocked while genuine required checks fail. Only a normal exact-head protected merge can close this requirement; then new main-source recertification is required. |
| Prompt 6: autonomous execution | Safe engineering, real runner execution and available native/browser validation continued without repeated permission questions. | Account artifact availability requires the organization's owner; GA #53 remains frozen, ga=false. |

## HTML reference reconciliation

The HTML is an interactive **design prototype**, explicitly containing sample cards,
preview dialogs and no live data. Its palette and editorial/community direction
match FIELDWORK V2. It does not authorize replacing production endpoints with its
placeholder actions. The app keeps higher-contrast text/focus variants rather than
copying the prototype's decorative coral into essential text. The original is
preserved unchanged for visual comparison and traceability.

## Evolution engineering boundary

The earlier industry/evolution source remains in scope. Added internal DDD modules
cover consent-based deterministic matching, independent outcome review/publication
and scoped programme invitations, with tests. They are not exposed product APIs.
Hasura-facing persistence, Authentik/SpiceDB decisions, Vault/KMS, NATS/Redpanda,
shared-service migration and OpenTelemetry contracts are recorded in the platform
ADR. Institutional pilots, AICO activation, beneficiary feedback, live payments and
full outcome/maintenance journeys require further implementation and external
owners; this reconciliation does not present them as delivered production features.

## Evidence boundary

Application/native build source: `777195c0dc75f4e9ec9089c8fdac92ec8e9a7e8f`.
Runner-policy fix and genuine CI source: `d94193f528c3dde8e5e93433dbfb6f48fe130b16`.
Final-source logs and manifests are retained under `build/evidence/completion/`.
The documentation integration commit is later than these immutable receipts; reuse
requires recording identical relevant inputs, never relabeling the artifact source.
No old-source GA certification transfers to a later source or merged main.

Genuine CI for the policy fix: verify run 41413525256, web run 41413525181 and
source-monitor run 41413525180. Mobile, API, deployment and web concluded success;
supply-chain and source-monitor validation passed before required upload failed
artifact quota. Security-boundary executed every step successfully but its GitHub
job conclusion remained in progress at reconciliation; it is not counted green.
Read live GitHub state for current conclusions.
