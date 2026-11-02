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

Workflows now target the isolated Linux **organization runner group**
`irespond-mac-isolated-20261102` (ID 4), restricted by GitHub to this repository and
explicit workflow files on `main` and the reviewed #71 feature branch. Required
checks run on trusted branch pushes, not public PR source. Branch protection still
requires the real GitHub Actions results; untrusted PRs have no passing required
checks. No required test or branch-protection context was removed.

The runner selection expression also sends unauthorized events to an unregistered
label, keeping them pending rather than skipped-green. Optional native/manual jobs
have separate labels to avoid starving required checks. Base-controlled
`pull_request_target` documentation ownership and all provenance checks remain.
Generated documentation publication refs need reviewed group-allowlist additions
before revalidation; they do not inherit permission to run arbitrary PR code.

The group API rejects `refs/pull/71/merge` as an ambiguous non-branch/non-tag ref.
An organization runner restricted to the approved branch refs did not accept the
old pull-request jobs. Trusted branch-push checks are therefore used, with feature
source-monitor comparisons explicitly anchored to the protected main baseline.

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
- No attached Android device/AVD and no full Xcode installation. Homebrew JDK 17
  is available even though macOS Java registration did not report it.
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

## Artifact storage blocker

On the initial full source-monitor run, all regression/fingerprint/comparison/index
steps passed, but the mandatory upload failed:

> Failed to CreateArtifact: Artifact storage quota has been hit. Unable to upload
> any new artifacts. Usage is recalculated every 6-12 hours.

Run: https://github.com/Atlasfsp/iRespond/actions/runs/41389682125

No upload step was suppressed or allowed to fail silently. The controller now
archives generated evidence locally before clearing each checkout. The organization
owner must restore artifact storage availability without paid usage (for example by
reviewing superseded storage and allowing quota recalculation). Existing certification
artifacts were not deleted. A successful self-hosted scheduler probe cannot clear
this separate evidence-upload requirement.

## Nested Docker storage compatibility

The first API run failed before tests while extracting the pinned YugabyteDB image:
Docker's containerd overlay snapshotter could not create an opaque-directory whiteout
(`operation not permitted`). Switching this dedicated machine to the userspace
`fuse-overlayfs` classic driver resolved a two-layer opaque-whiteout regression probe.
The provisioner now configures that driver and executes the probe before CI. Host
shares, host networking and runner privileges were not broadened. The API job still
requires genuine rerun evidence; the probe does not certify database integration.

## Reachable Go certificate advisory

The real supply-chain job found GO-2026-6809 in Go 1.26.9. The fix raises the module
minimum and both CI Go lanes to 1.26.10 and pins the corresponding bookworm compiler
image at `sha256:23ce71337b726608afb1bc00986e630a05034a87a87ea1fc2cd1ae5cf33387eb`.
The official Linux ARM64 SDK is checksum-verified before prewarming the runner cache.
The patched candidate still needs a genuine negative scan and full API rerun.

## CI fixture storage and inventory completeness

YugabyteDB correctly rejected writes when the shared Linux root filesystem became
nearly full. CI now uses a bounded 4 GiB tmpfs data volume with a 3 GiB container
memory limit, consistent with YugabyteDB's documented RAMDisk guidance for CI/CD.
The data directory used only 41 MiB in the failed run. Disk-protection flags remain
unchanged. Readiness now performs real table creation and insertion, rather than
accepting a read-only `SELECT 1` result. Backup/restore and all API tests remain.
This fixture validates logical behavior, not physical production storage durability.
Reference: https://docs.yugabyte.com/stable/best-practices-operations/administration/

The release's original non-recursive pnpm inventory contained only the empty root
workspace. It now captures production workspace roots plus the complete frozen
resolution graph, policy and Metro patch bytes. Go module edges and per-file hashes
are included, and a verifier rejects missing mobile dependencies or missing graphs.
Only disposable CI containers and this task's unused runner files are cleaned up.

## Optional cache service outage

A genuine mobile run stalled restoring a remote cache, then npm timed out fetching
`@expo/vector-icons`; no application tests executed in that failed job. The required
workflows no longer restore remote pnpm/Go caches. The isolated VM keeps a bounded
lifetime content-addressed pnpm store and Go downloads, with lower fetch concurrency
and retries. Frozen installs and lockfile integrity remain required. This removes
an optional cache-service dependency; it does not remove mandatory artifact upload
or resolve the organization storage quota. Regression checks enforce this boundary.

## Native Android route validation

The actual ARM64 demo APK assembled and cold-started, but navigation to sign-in
exposed an inherited `Cannot find native module ExpoCrypto` crash. JavaScript
bundling and type checking had not detected the missing native registration.
Promoting the already-locked SDK 53 `expo-crypto@14.1.5` to a direct application
dependency enables its native autolinking without changing its resolved package.
The new mobile CI check resolves the actual Android native manifest and requires
CryptoModule plus browser, secure storage, media and location modules. It records
that manifest against the source SHA. Expo's AuthSession installation guidance
also requires Crypto: https://docs.expo.dev/versions/latest/sdk/auth-session/.

Native visual QA also found the long demo notice clipping within its icon row.
Constrained, shrinking text now wraps inside the row; the workspace sign-in copy
uses account/project permissions instead of identity implementation details.
Final APK hashes, native screenshots and route-smoke results are retained separately
from Expo Web captures. A demo/debug signing key does not provide production signing
or physical-device/iOS certification.
