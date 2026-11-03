# iRespond — Codex Master Handoff: MacBook Runner, CI Closure, Security, PR #71 Merge
**Prepared:** 1 November 2026, Lagos time  
**Run this document in Codex from the EXISTING checked-out `Atlasfsp/iRespond` repository on the user's MacBook.**  
**Mission:** Fully mature PR #71, establish safe and reproducible zero-extra-paid GitHub Actions execution using a Mac-hosted isolated runner, resolve all genuine issues, and merge after authentic required checks pass. Deliver actual frontend screenshots and a factual post-merge report. Do not bypass branch protection, forge results or declare GA.

## Source of truth — refresh before doing anything
- Repository: https://github.com/Atlasfsp/iRespond
- Consolidated open PR: https://github.com/Atlasfsp/iRespond/pull/71
- PR branch: `feat/impact-experience-evolution-20261101`
- Last inspected PR head: `e1d9cb524164aa0e1c8fdaf0eb878c49dac80536`
- Last inspected `main`: `c12a4b5b8736700c2fdf2739fcd6f9a41c233521`
- PR #75 (FIELDWORK V2): already merged **into PR #71's feature branch**, not directly to `main`.
- PR #76: dependency advisories / pnpm overrides: https://github.com/Atlasfsp/iRespond/issues/76
- Issue #53: frozen external GA certification: https://github.com/Atlasfsp/iRespond/issues/53
- PR head already includes actual browser screenshots:
  - `docs/screenshots/fieldwork-v2-web-desktop.webp`
  - `docs/screenshots/fieldwork-v2-web-phone.webp`
  - `docs/screenshots/fieldwork-v2-expo-mobile-web.webp`
- At last inspection, the PR was mergeable **with no source conflicts** but blocked by **six of six required GitHub status checks**. The GitHub-hosted jobs failed before executing steps. Repeated reruns did not resolve the runner/billing problem. Auto-merge is disabled for this repository.

**Important constraints:** No paid GitHub-hosted minutes or billing activation. Do not repurpose the personal Mac login as an insecure internet-facing public PR runner. Do not change `main` outside normal, protected merge. Do not force-push, blindly overwrite another worker's changes, modify unrelated AtlasFSP repositories, change `ga=false`, or reuse old source-SHA certification artifacts.

## One command to orient the working folder
```bash
# From an existing iRespond clone, not an arbitrary parent directory:
pwd
git remote -v
git status --short --branch
git fetch origin --prune
gh repo view Atlasfsp/iRespond --json nameWithOwner,isPrivate,defaultBranchRef
gh pr view 71 -R Atlasfsp/iRespond --json state,isDraft,headRefName,headRefOid,baseRefName,mergeable,statusCheckRollup
uname -m
sw_vers
```
If unsure of the existing folder, discover one using `mdfind 'kMDItemFSName == "iRespond"'` or `find "$HOME" -maxdepth 5 -type d -name iRespond 2>/dev/null`. Prefer the already-used working tree under the user's existing code folders; NEVER create a duplicate clone by default. If multiple clones exist, inspect remotes, cleanliness, and source status before choosing. Never discard uncommitted work. Install tooling only after inventory. Use a dedicated CI VM disk location outside this repository.

---

# PROMPT 1 — Complete discovery, safety baseline and architecture decision

You are Codex acting as lead iRespond release engineer and CI security architect. Continue from the EXACT repository and PR context at the top of this document. Work autonomously through investigation and safe implementation; stop at external permissions/account settings you genuinely cannot control, not at ordinary engineering tasks.

1. Confirm existing Mac repository folder and record user changes without modifying them. Determine Apple Silicon ARM64 vs Intel X64, macOS version, disk, memory, Docker Desktop/Colima/Lima/UTM availability, `gh` login and repository rights. NEVER guess the absolute user folder.
2. Query repository current state: `gh pr view 71`, GitHub checks, branch protections/rulesets (if accessible), workflows, required check names, exact current branch HEAD, merge-base, reviews and PR discussion. Check whether Actions account billing is only blocking GitHub-hosted runners or blocking **all** GitHub Actions orchestration. Do not assume that self-hosted works just because its runtime is free.
3. Classify each of the six required checks: `mobile`, `security-boundary`, `supply-chain`, `api`, `deployment` from `.github/workflows/verify.yml`, and `web-contract` from `.github/workflows/web-verify.yml`. Inspect documentation-owner, living-manuals, docs sync and Android-demo checks separately; determine which are mandatory or advisory from actual ruleset data. Never falsely green a skipped required check.
4. Inspect `.github/workflows/verify.yml`, `web-verify.yml`, `docs-baseline-ownership.yml`, `docs-interface-sync.yml`, `living-manuals.yml`, `build-android-demo.yml`. Note Linux-only constructs (apt-get, sed -i, GNU tools), Docker `run/build`, pinned YugabyteDB/RustFS image digests, Gradle/Android SDK, Go toolchain, Helm, Playwright, artifact publication and source-SHA provenance.
5. Make the runner architecture decision: default to a **disposable, isolated Ubuntu Linux VM on this Mac**, with its own dedicated, least-privilege OS user, Docker Engine and supported GitHub Actions runner. Treat native macOS as optional for Xcode, simulators, screenshot and iOS/Android device testing. A Linux VM preserves Ubuntu workflow semantics and avoids modifying the exact test logic merely to run on macOS.
6. If Apple Silicon, verify pinned container images actually support linux/arm64 by manifest inspection. If not, explicitly assess isolated linux/amd64 emulation performance, or choose a compatible image only after verification and pin it by immutable SHA. Do not silently use the wrong architecture, loosen digest pins, or assume Darwin Docker works identically to Linux.
7. The repo is PUBLIC. Never run arbitrary public fork PR contents on a persistent personal-machine runner. Design restricted same-repository trusted-branch job guards, least-privilege GitHub token, runner labels and repository access, and disposable VM clean-slate cleanup. Ensure `pull_request_target` checkout remains BASE-controlled and untrusted head is treated only as untrusted data. No personal SSH keys, browser profiles, cloud credentials, production secrets or broad PAT inside CI VM.
8. Make a readable baseline audit report `docs/engineering/CI_MAC_RUNNER_HANDOFF_STATUS.md` (non-sensitive) or equivalent draft artifact. Record exact SHA and checked preconditions. Avoid dumping credentials, user paths or tokens in logs.
9. Print a concise blocker/action table; then proceed to PROMPT 2 unless GitHub runner registration needs a human-issued ephemeral token. Ask only for that precise UI action and continue with work that does not require it.

**Acceptance:** fresh metadata, explicit no-payment plan, truthful trust boundary, exact six-check inventory and an architecture that can run real Linux jobs from the Mac.

---

# PROMPT 2 — Install and validate a hardened self-hosted runner INSIDE the Mac's Linux VM

Design and implement the smallest maintainable local-runner solution that makes genuine GitHub Actions check runs possible without buying hosted minutes. Follow the security architecture from Prompt 1 and the user's constraint of no GitHub Actions payment.

1. Check exact user permissions and organization runner policy. The organization may restrict repository-level self-hosted runners under Settings → Actions → General / Runners. If unavailable, request the necessary organizational action. Do not change GitHub billing.
2. On the Mac install a supported VM manager if none exists (prefer an existing one). Create an Ubuntu Linux VM with enough CPU/RAM/disk for the pinned YugabyteDB, RustFS, Go builds and Android tools. Start with a single runner and **one active job at a time** to avoid memory/port conflicts. Isolate the VM from macOS home, SSH keys, photos and confidential company files; mount only explicitly necessary workspaces. Docker Engine runs inside VM; never expose its daemon on the network.
3. Install current, supported GitHub Actions runner software inside the VM using instructions/version and checksum presented by the official GitHub **Settings → Actions → Runners → New self-hosted runner** page for `Atlasfsp/iRespond`. Registration uses a **time-limited token**, retrieved by the owner in the UI. Never hard-code, commit, paste to conversation, or leave that token in shell history/logs. Name runner `irespond-linux-ci-01`, custom label `irespond-trusted`. Match additional GitHub-generated Linux and ARM64/X64 labels and restrict repository access.
4. Configure runner as a dedicated non-root user, with no privileged accounts or production secrets. If Docker group membership gives root-equivalent access, treat the entire VM as untrusted and disposable. Use a runner access policy ensuring only trusted, reviewed internal branches are eligible. Do not route fork PR jobs into the VM. Add least-privilege jobs and refuse unsafe triggers. Disable or guard `pull_request_target` workflows that would execute untrusted PR code; preserve base-controlled documentation ownership verification. Do not accept a weakened permissions policy solely to get checks green.
5. Prefer a **gated runner smoke workflow** using the same-repository trusted branch with only trivial `whoami`, `uname`, exact git SHA and disk capacity; no secrets. Determine whether GitHub's Actions controller schedules a `self-hosted` job despite the account's billing block. If it never schedules, record the exact runner state (`online`, `idle` or `busy`), workflow dispatch outcome and GitHub's billing notification. Do not forge a green status. Escalate only the specific account issue; continue offline verification while blocked.
6. Once smoke passes, alter only the necessary workflow `runs-on` values to select `[self-hosted, Linux, ARM64, irespond-trusted]` (or X64 based on verified VM), preserving permanent job names and required contexts. Keep all action SHAs pinned and existing tests intact. Avoid switching to Darwin for Linux Docker jobs. Ensure the PR workflow cannot be modified by untrusted sources in a way that gains secret access.
7. Schedule cleanup: VM reset/replace after each PR where practical, per-job Docker container cleanup, isolated workspace/cache reset, disk hygiene, idle shutdown and runner software auto-update. A long-lived runner must be disabled when not doing trusted CI. Apple Silicon performance: ensure memory/disk headroom for YugabyteDB, RustFS, Docker build and Gradle. Keep an offline reproducible bootstrap script with no secrets, clear uninstall path and documentation of assumptions.
8. Execute each required workflow in GitHub and verify that **real job steps** start and report to the exact PR HEAD. If GitHub-hosted labels remain in required jobs, prove that replacement runner selectors are applied on PR branch. Avoid rerunning the same known-billing-failed hosted labels.
9. If actual GitHub Actions service is entirely blocked by billing/locked account, provide a no-payment **local Jenkins or equivalent** fallback to run the identical tests, but acknowledge it does NOT automatically satisfy GitHub-protected status checks. A supported, authorized GitHub App/check-run bridge could be explored only if it reports actual check provenance and does not spoof existing GitHub Actions contexts; do not use branch-protection bypass, fake commit statuses or manual overrides.

**Runner acceptance:** authenticated restricted runner online, trusted smoke job succeeds with actual steps; required jobs use it and report real results. Otherwise log BLOCKED_BY_GITHUB_ACCOUNT and proceed with local tests without falsely claiming a merge.

Helpful official references:
- https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners
- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/actions/reference/runners/self-hosted-runners
- https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application?platform=mac
- https://docs.github.com/en/organizations/managing-organization-settings/disabling-or-limiting-github-actions-for-your-organization

---

# PROMPT 3 — Repair dependencies, complete test matrix, validate security and release evidence

Work on a carefully scoped branch based on the current PR #71 head. The original code-level tests already passed in an independent Linux checkout; re-run with a fresh exact SHA. Do NOT treat earlier testing as permanent evidence after source changes.

## Supply chain / npm security
- Issue #76: baseline `pnpm audit --prod --audit-level high` previously found 10 high advisories, including transitive Undici 6.29.0 and 7.30.0, decode-uri-component 0.5.0, node-forge 1.4.0, minimatch and glob.
- `pnpm@10.15.0` reports that `package.json`'s `pnpm.overrides`, `pnpm.patchedDependencies`, `pnpm.auditConfig` settings are IGNORED. Migrate those settings to supported `pnpm-workspace.yaml` locations **without losing the existing Metro patch** (`patches/metro@0.82.5.patch`) or existing justified exceptions. Preserve full lockfile provenance.
- Inspect package-manager version and up-to-date advisories. Choose compatible patched dependency versions, not broad forced major upgrades. In previous isolated exploration, regenerated overrides reduced high findings from 10 to 4 but remaining `undici@7.30.0` needed a patched release; none of that exploratory work was committed. Reproduce safely, check correctness after applying each change, and produce a signed-off manifest of resolved vs remaining vulnerabilities.
- Run `pnpm install --frozen-lockfile`, `pnpm audit --prod --audit-level high`, Expo dependency compatibility, mobile TS, Metro web/native bundling and browser rendering. Check `pnpm-lock.yaml` diff for accidental full dependency upgrades; review breaking Expo/React Native changes. Do not waive high vulnerabilities or misleadingly mark an audit green.

## Canonical web/mobile checks
Run these, preserving nonzero exit codes:
```bash
node --check apps/web/app.js
node --check apps/web/stitch-catalog.js
node tools/verify_fieldwork_design.mjs
node tools/verify_horizon_experience.mjs
node tools/verify_web_frontend.mjs
node tools/verify_frontend_api_coverage.mjs
node tools/verify_frontend_execution.mjs
node tools/verify_frontend_reachability.mjs
node tools/verify_frontend_authorization.mjs
node --experimental-strip-types tools/offline_demo.test.mjs
python3 tools/verify_openapi_contract.py
pnpm mobile:typecheck
bash tools/security_boundary.sh
bash tools/verify_ci_runtime_pins.sh
bash tools/repo_metrics.sh
```
Also inspect and run the repo's CI docs freshness checks; regenerate truthful living-manual candidates when source changes make them stale, following existing workflow contracts and the exact-SHA documentation baseline. Keep artifacts in correct folders and do not backdate screenshots.

## Backend, database, storage and deployment
- Go version required by `.github/workflows/verify.yml`: 1.26.9. Run `go mod verify`, `go test -p 1 ./...`, `go vet ./...` from `services/api` and an actual `govulncheck ./...` with version v1.7.0.
- Provision disposable digest-pinned YugabyteDB and RustFS test containers, verify YSQL and object-store readiness. Run migrations *twice* (idempotency), negative tenant isolation and authz tests, evidence lifecycle tests, backup+restore and S3 compatibility, API HTTP load baseline, signed evidence checks, `docker build` for production API. Validate container host architecture and pinning.
- Verify `helm lint deploy/helm/irespond`, `helm template` to `/tmp/irespond-rendered.yaml`, `tools/verify_deployment.sh`. Never infer production readiness from local Helm rendering.
- Generate dependency inventory, release provenance and GA candidate validation files using the **workflow's correct order**: release manifest/source first, GA evidence afterwards. Ensure SHA and tree match. PR runs must produce `VALIDATION_ONLY`; `ga=false`. Only a successful `push` run on landed `main` may be a new exact-SHA certification candidate; external signing/canary/legal/security remain unresolved until proven.
- For `offline-demo-apk`, install Java 17, Android SDK and matching platform/build tools; run exact demo identity, Expo prebuild, Android arm64 release build, artifact hashes and provenance. Use a compatible Linux guest and verify any emulation. The offline demo package is not a Play Store-production signed release.

## Test and security output
- Capture real log excerpts with command, environment, SHA, exit code and generated artifact hash. Redact secrets and PII. For expected failures, classify CODE / DEPENDENCY / INFRASTRUCTURE / RUNNER / EXTERNAL. Never report a test as passed if it was not executed.
- Preserve the action principle: unverified reports ≠ verified needs; pledges ≠ charged funds; user permissions ≠ UI visibility; AICO recommendations ≠ verified impact.
- Fix genuine source or CI/test issues with narrow changes. Do not weaken or delete a test, reduce coverage, disable a workflow or silently bypass protection to satisfy this prompt.
- Commit reviewed fixes to the PR feature branch via conventional commits. Keep unrelated security fixes in their own PR only if necessary, then merge/test in the correct order.

**Acceptance:** each of six mandatory GitHub jobs succeeds with real steps and exact head SHA; no known unfixed high vulnerabilities; all local parity and native build checks passed; external GA explicitly remains separate.

---

# PROMPT 4 — Release-grade FIELDWORK web/mobile UX, screenshots, docs and edge cases

The consolidated PR includes FIELDWORK V2 from former PR #75, already merged into PR #71. Confirm actual files and screenshots; do not regenerate an unrelated visual redesign. The existing design system name FIELDWORK is not a company or product rename.

1. Compare live browser and Expo mobile preview against `docs/design/FIELDWORK_DESIGN_SYSTEM_V2.md`, the 91 Stitch design contracts, and specific routes. Preserve visual fidelity and functional API behavior. Repair overflow, contrast, focus, dark/light mode, dynamic type, empty/error/offline states and tab accessibility. Do not turn demo content into production data.
2. Capture authenticated and unauthenticated desktop web at 1440×900, tablet at 768×1024, phone responsive web at 390×844, Expo React Native Web at 390×844, and actual iOS/Android device or simulator captures when available. Label each clearly by source and environment. Native builds and device screenshots may require local Xcode and Android SDK; do not claim they exist without capturing them.
3. Verify critical workflows: NeedMap with live location and evidence status; report with location-review queue and offline retry; projects and permissions; Impact Passport (activity vs measured outcome); role-aware links; notification; privacy; trust/safety. Confirm no fake map pins, fake completed contributions or synthetic financial settlements.
4. Add screenshot comparison evidence to branch docs/screenshots and/or workflow artifacts with source HEAD SHA, viewport/device, timestamp, API data mode (real/demo/offline) and hashes. Keep images readable and bounded; do not commit large secrets or user-sensitive screenshots.
5. Where meaningful, run Playwright screenshot smoke and a11y checks plus Expo E2E. Review test failures in both CSS and React Native components and resolve them. Avoid modifying generated visual snapshots merely to hide rendering defects.
6. Sync any changed documentation and UX contracts and produce a concise Markdown design acceptance report.

**Acceptance:** every screenshot reflects running code, no screenshot passes off phone-sized web as native mobile, no major interaction or authorization regressions, and documentation is aligned with the accepted source.

---

# PROMPT 5 — Final PR conflict closure, authentic checks and protected merge

Take full engineering ownership of PR #71 to completion, respecting branch protections and financial limits.

1. Fetch fresh PR details, exact head, latest `main`, commit ancestry, required check contexts, CI runner online status, workflow checks and review threads. PR #75 is already merged into #71; do not try to merge it again. Resolve any new source conflicts by preserving semantic behavior; do not `git push --force` or discard unseen code.
2. Branch protection currently blocks merges with HTTP 405: `6 of 6 required status checks are failing.` The six required checks come from `verify.yml` (mobile, security-boundary, supply-chain, api, deployment) and `web-verify.yml` (web-contract). Confirm actual required context names via repository settings/REST/`gh` before acting. Existing docs-baseline-ownership status and other workflows must also be respected if required.
3. Run genuine required checks on the registered, restricted self-hosted Linux runner, and capture their GitHub run URLs, SHA and success conclusions. Trigger re-runs against the **new PR head**, not old stale SHA. If Actions jobs cannot start because account entitlement/billing is locked, STOP the merge. A local green test is not an accepted GitHub check run. Do not create false commit statuses, override a branch-protection rule, remove required contexts, or use admin bypass as a shortcut.
4. Do an exact-SHA compare and final review. Ensure all material findings, medium/high security vulnerabilities, documentation freshness, AppForge/SkyForge/Droplet external ownership constraints and GA #53 state have accurate descriptions. Security issue #76 must not be closed without validated remediation.
5. After all required checks and approvals truly pass, execute protected GitHub merge on PR #71 with the expected HEAD SHA, using approved method (merge/squash according to repo policy). For example, once verified: `gh pr merge 71 -R Atlasfsp/iRespond --merge --delete-branch=false` only if policy allows; compare HEAD again to prevent races.
6. Verify `gh pr view 71 -R Atlasfsp/iRespond --json mergedAt,mergeCommit,state,headRefOid`, `git fetch`, and `origin/main` contains actual merged tree. Confirm there are zero open iRespond PRs (unless new legitimate review PRs were created). Do not claim merged based on CLI exit code alone without checking GitHub.
7. Immediately recognize that the historical GA certification evidence (`#53` and SHA `6484873...`) is not transferable. A new `main` SHA must undergo new source/runtime/external recertification. `ga=false` until explicit cross-project external gates are met. Do not deploy to production as part of this task unless independently authorized and certified.
8. Produce an accurate final change/evidence report:
   - Before and after branch SHA, merge commit, PR URL
   - Source code and build changes, resolved conflicts, security issue disposition
   - Six required GitHub checks: success URL, SHA, execution evidence
   - Local test matrix, screenshots URLs and device provenance
   - Outstanding external GA gates and approval owners
   - Runner shutdown/removal and cleanup status
9. Once done, disable or delete the repository's disposable CI runner if only needed for this closure, remove sensitive local artifacts, and do not leave an unrestricted public PR runner online.

**Final invariant:** no payment, no fabricated green checks, no disabled security policies, no untrusted workflow execution on a personal Mac. If GitHub genuinely cannot schedule self-hosted Actions because billing entitlement is locked, finish all offline code work and report a precise blocker plus minimum user-admin step; do not promise the merge occurred.

---

# Optional PROMPT 6 — One-shot autonomous operator

Treat Prompts 1–5 above as the authoritative autonomous execution contract. Starting from the existing `iRespond` repository on this Mac, execute them in dependency order and make real reviewed commits. Do all safe work yourself without repeated permission questions. Only pause for the runner registration token, organization-level permission, or another action that truly requires my personal authorization. Create no paid service, no GitHub hosted-minute usage, no new duplicate repository clone, and no automated bypass of checks. On completion give me GitHub merge verification, clean screenshots of the web frontend and actual Expo/native mobile client with honest provenance, exact test links, and production GA blockers. If blocked, provide the exact GitHub account/runner problem and what I should click/change, while leaving the branch safe for resumption.

---

# MacBook setup primer for operator (do not run blindly)

In your Mac Terminal, first find your EXISTING repository, navigate into it, check `git remote -v` and `git status`. Point Codex at that folder, not the runner installation directory. A dedicated Linux VM runner should have its own workspace **outside the project** and isolated from personal files.

Install or use existing `git`, `gh`, VM manager, Linux guest and Docker Engine as appropriate. Let Codex choose based on Mac architecture and existing tools; pinned image architecture may dictate x64 emulation. Do not put PATs/tokens in `.env`, source, scripts or shell transcripts. The GitHub runner registration token is displayed in the repository's Settings → Actions → Runners → New self-hosted runner UI. Use the instructions shown there for the CURRENT runner release and architecture. Run the CI VM only for trusted, controlled workloads.

**Current official source references:**
- GitHub self-hosted runner official install: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners
- GitHub runner host requirements: https://docs.github.com/en/actions/reference/runners/self-hosted-runners
- GitHub runner security/public repository warning: https://docs.github.com/en/actions/reference/security/secure-use
- GitHub Actions billing: https://docs.github.com/en/actions/concepts/billing-and-usage
- GitHub account lock can block even free-tier GitHub Actions: https://docs.github.com/en/billing/how-tos/troubleshooting/locked-account
- GitHub 2026 pricing: https://github.com/resources/insights/2026-pricing-changes-for-github-actions

