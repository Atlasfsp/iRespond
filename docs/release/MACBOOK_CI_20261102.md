# MacBook CI execution — 2 November 2026

## Inputs and source

Original pasted instructions are preserved in `.codex-handoff/01-fieldwork-source.txt`,
`02-mac-ci-source.txt` and `03-evolution-source.txt`. The downloadable six-prompt ZIP
and named full Markdown handoff were not attached; the included starter instructions,
phase table and PR #71 handoff comment define this execution.

Starting PR #71: `e1d9cb524164aa0e1c8fdaf0eb878c49dac80536`.
Starting main: `c12a4b5b8736700c2fdf2739fcd6f9a41c233521`.
Existing local RC hardening branch is preserved. No new clone or production deployment.

## Scheduling experiment

GitHub's original hosted job annotation says: "The job was not started because your
account is locked due to a billing issue."

A dedicated OrbStack Ubuntu 24.04 ARM64 machine was created with `--isolated
--isolate-network`, 4 CPUs, 6 GiB memory and 40 GiB disk. No host shares or forwarded
SSH agent. `/Users` and `/mnt/mac` absent. No personal or production secrets copied.
Runner 2.338.0 checksum verified against GitHub's runner-download API:
`628b4a7258487b80c1d3c221095a7ded349f5ae0175fd3dfab708d07428f041b`.

The ephemeral scheduler probe **passed** with actual executed steps:
https://github.com/Atlasfsp/iRespond/actions/runs/41388518495

The runner automatically deregistered after that job. This proves unpaid self-hosted
scheduling works despite the hosted billing lock; it does not satisfy release gates.

## Required check ownership

Live branch protection requires `mobile`, `security-boundary`, `supply-chain`, `api`,
`deployment` and `source-monitor`, bound to the GitHub Actions app. `web-contract`
is additionally tested. No check name, required context or branch protection changed.

Workflows now target only the isolated Linux label and restrict PR execution to
same-repository #71 and its exact branch name. Main push/manual paths remain trusted.
All existing test steps remain. Base-controlled `pull_request_target` logic remains
base-controlled; its runner change cannot take effect until protected merge.
Future PRs require a reviewed update to this temporary trust allowlist.

Never start a repository runner on the personal macOS account. Provision ephemeral
runners only while executing reviewed jobs, remove workspace data between jobs and
remove the dedicated VM/registration when finished. GitHub's safety reference:
https://docs.github.com/en/actions/reference/security/secure-use

## Local validation

- pnpm **10.15.0** frozen install passes after workspace policy migration.
- Production audit: **10 high → 0 high**, 0 critical; 3 moderate and 1 low remain.
  Moderate glob/minimatch fixes require major-version compatibility work; deepmerge
  has no published fixed version in the audit response. No advisory suppression.
- Metro 0.82.5 patch retained unchanged; patched image-size import exercised by Expo.
- Mobile TypeScript and Expo SDK dependency compatibility pass.
- Expo web bundle builds; phone capture is React Native Web, not native-device proof.
- Web desktop/tablet/phone: no horizontal overflow or JavaScript runtime errors.
- FIELDWORK/Horizon, API ownership/execution/reachability/authz, offline, OpenAPI,
  repository security/pins and Helm deployment contracts pass locally.
- Go unit suite and vet pass without integration environment; integration tests that
  require `TEST_DATABASE_URL` / object storage skip and are not counted as E2E evidence.
- No attached Android device/AVD, no Java runtime, no full Xcode installation.
  Native builds, VoiceOver/TalkBack and physical-device certification remain open.

Raw local evidence: `build/evidence/completion/`. Never promote local results to
fabricated GitHub statuses. No GA declaration; #53 stays separate.

## Evolution implementation boundary

The FIELDWORK semantic palette now reaches existing native screens through the
Stitch compatibility adapter; this is not full screen-by-screen layout certification.
New tested internal domain modules cover deterministic opt-in matching, independent
outcome review/publication filtering and scoped programme invitation acceptance.
They have no product endpoint or persistence yet. See the platform ADR for Hasura,
Authentik, SpiceDB and shared-service contracts required before exposing writes.

Institutional pilot execution, legal/security sign-off, shared-service onboarding,
AICO activation and real payment infrastructure require external owners and evidence.
