# Release engineering, immutable candidates, local MacBook CI and certification

## Release posture, as verified 2026-11-02
- Historical frozen candidate: `6484873c8a0c3306a5972247bcc9981da4051bc6`, run `32952095093`, artifact `9600540959`, decision `READY_FOR_EXTERNAL_CERTIFICATION`, `ga=false`. This is a dated prior reference, not the latest main tree.
- Main at retrieval: `c12a4b5b8736700c2fdf2739fcd6f9a41c233521`. PR #71 head: `e1d9cb524164aa0e1c8fdaf0eb878c49dac80536`. PR #75 already merged into #71, not into main.
- PR #71 currently has no reported merge conflicts, yet 6/6 required GitHub checks are failing because GitHub Actions jobs did not start. Owner identifies GitHub-hosted Actions payment as the barrier and authorizes **MacBook self-hosted runner only**, no paid minutes.
- Production dependency audit issue `#76`: high-severity vulnerabilities in prior lockfile; historical audit found ten high, eight moderate. Treat numbers as **as-of historical finding**, remeasure on exact current SHA. Do not auto-upgrade Expo/Metro blindly; preserve the Metro patch and SDK compatibility.

## Protect historical candidate, track new one separately
A certification *candidate* is the tuple `(source commit, tree SHA, CI run ID, toolchain versions, lockfile hash, image digest, Helm/package checksum, test evidence, human external approvals)`. An `accepted main` candidate is produced only by a green `main` push after the branch merge; a PR head or synthetic merge commit is `VALIDATION_ONLY`.

Codex MUST:
1. Capture SHA and tree identity before work; store no credentials in repo.
2. Preserve original issue #53, source commit, run, artifact and hash; do not edit to imply new changes passed historical external checks.
3. On merge, create new candidate with new exact source/tree/check identity. Preserve `ga=false`. Use `tools/release_evidence.sh`, `tools/dependency_inventory.sh`, `tools/ga_candidate_evidence.py` as intended, **after** building prerequisite artifacts.
4. Do not simulate `GITHUB_EVENT_NAME=push` or fake `GITHUB_REF=refs/heads/main` to manufacture `handoffEligible=true` in local evidence. Local tests are valuable but not an accepted release run.
5. Keep old-release rollback artifacts and documentation accessible. Any GA scope change (e.g., processing payments) opens its own release review.

## Faithful verification workflow map

| Workflow/job | Expected evidence | Blockers / environment |
|---|---|---|
| `verify.yml` / `mobile` | `pnpm install --frozen-lockfile`, Expo TS check, repository metrics | Node 22, pnpm 10.15.0 |
| `verify.yml` / `security-boundary` | `tools/security_boundary.sh`, pins, OpenAPI route contract | Bash/Python and exact pinned action constraints |
| `verify.yml` / `supply-chain` | `pnpm audit --prod --audit-level high`, Go verify + `govulncheck`, SBOM/dependencies, release + GA evidence | remediation #76, Go 1.26.9, Helm 3.18.4 |
| `verify.yml` / `api` | real YugabyteDB CI, real RustFS S3, migration twice, Go tests and vet, backup restore, HTTP load check, Docker image | Ubuntu Linux, Docker, pinned images, enough RAM/CPU |
| `verify.yml` / `deployment` | Helm lint/template, rollout safety, probes/HPA/PDB/network policy checks | Helm 3.18.4 |
| `web-verify.yml` / `web-contract` | browser syntax, FIELDWORK/Horizon, API coverage/execution, reachability, authz, offline demo | Node 22; no arbitrary network |
| `living-manuals.yml` / freshness + build-manuals | source-to-manual route/screenshot freshness; actual rendered documentation | Python, Playwright, Graphviz, LibreOffice, PDFs |
| `docs-baseline-ownership.yml` / baseline-ownership | base-controlled publication provenance and protected branch ownership | `pull_request_target` security; **never run untrusted PR code with write token** |
| `build-android-demo.yml` / offline-demo-apk | Expo offline demo, bundle/export, Gradle ARM64 APK and checksums | Linux, Java 17, Android toolchain, 45m job limit |

Check the actual required status names via GitHub branch protection/ruleset; do not infer “six” contexts from local filenames. The required set may change.

## MacBook strategy — secure by default
1. Locate existing repo without recloning, document `uname -m` (Apple Silicon x64/arm64) and Mac hardware resources. Minimize use of personal files; no desktop access permissions beyond what is required.
2. Create a **dedicated disposable Ubuntu Linux VM** (e.g. Lima or UTM), with explicit owner approval for VM creation and storage allocation. Use Linux inside the VM for all Ubuntu workflows; native macOS is used only for Apple signing, simulator or device testing when authorized.
3. Verify architecture compatibility for pinned YugabyteDB/RustFS image digests on Apple Silicon. If no compatible manifest or x86 emulation fails, use a compatible isolated Linux x86-64 environment approved by the owner; never silently replace immutable digests or lower integration quality.
4. Install GitHub's **official** runner from GitHub settings into the VM and register with a short-lived, user-provided token. Never paste tokens into Codex transcripts, files or logs. Restrict runner access to `iRespond` via runner groups or repo scope; use a runner account with minimal privileges, no host directory shares, no production credentials and ephemeral workspaces. Use self-hosted labels plus a custom verified label such as `irespond-ubuntu-ci`. Never set `self-hosted` as the only selector for unrelated jobs.
5. Because the repository is **public**, treat every external PR as attacker-controlled. The safest option is a disposable, one-job runner VM with fresh image per run and no long-lived trust. Where that cannot be achieved, do not run fork PRs, avoid `pull_request_target` executing PR code, do not mount Docker socket from macOS, prevent host secrets access, disable broad network egress, set restrictive token permissions and limit which workflow refs can execute. This risk is not solved by labeling the runner alone.
6. Test an isolated temporary smoke workflow on an **approved branch** after registering. If account billing still blocks GitHub workflow scheduling, document GitHub's message and stop trying to force statuses. Run independent local suites instead and leave protected PR unmerged.
7. Propose a reviewed workflow PR that changes `runs-on` to the restricted labels **for only applicable jobs**. Keep pinned `uses` SHAs, required job IDs/contexts, workloads and test commands. Beware that existing `tools/verify_ci_runtime_pins.sh` scans the workflow and must stay effective. Update the workflow itself only after smoke and security sign-off.
8. Keep `pull_request_target` baseline guard base-controlled; no untrusted head execution with `statuses:write`. Never issue success statuses manually. Preserve real check provenance.
9. Unregister runner and rotate credentials when work ends; remove VM snapshots that may contain repo tokens or private artifacts; retain sanitized immutable evidence only.

## Release gate procedure

**Gate R0 – Inventory**
- Confirm `gh repo view Atlasfsp/iRespond`, `gh pr view 71 --json ...` and exact current refs; verify clean working tree or avoid touching uncommitted work.
- Inspect existing requirement branch protection via GitHub UI/API with authorized access.
- Check source tree for unmerged PR #71 and its code dependencies; no force push.

**Gate R1 – Local source verification**
- Web: `node --check apps/web/app.js`, `node --check apps/web/stitch-catalog.js`, `node tools/verify_fieldwork_design.mjs`, `node tools/verify_horizon_experience.mjs`, `node tools/verify_web_frontend.mjs`.
- API coverage: `node tools/verify_frontend_api_coverage.mjs`, `node tools/verify_frontend_execution.mjs`, `node tools/verify_frontend_reachability.mjs`, `node tools/verify_frontend_authorization.mjs`, `python3 tools/verify_openapi_contract.py`.
- Offline: `node --experimental-strip-types tools/offline_demo.test.mjs` (Node 22 check for syntax/flag support).
- Mobile: `pnpm install --frozen-lockfile && pnpm mobile:typecheck`; run Metro startup, Expo dependency compatibility and device/simulator smoke.
- Security/pins: `bash tools/security_boundary.sh`, `bash tools/verify_ci_runtime_pins.sh`, `pnpm audit --prod --audit-level high` (**must succeed or explicitly block**).
- Go: `cd services/api && go mod verify && go test -p 1 ./... && go vet ./...`.
- Helm: `helm lint deploy/helm/irespond`, template and `tools/verify_deployment.sh`.

**Gate R2 – Real integration verification**
- Start actual pinned YugabyteDB/YSQL and RustFS **within isolated Linux Docker**. Ensure S3 signed PUT/GET, immutable upload, SHA-256 streamed readback and moderation.
- Migrate fresh schema twice, check idempotency and restore via `tools/verify_yugabyte_backup_restore.sh`.
- Negative tests: cross-tenant attempted data leaks, role bypass, evidence access prior to approval, duplicate event delivery, retry/cancellation, offline duplicate uploads, long-running task contention, crash/restart.
- HTTP load gate from canonical workflow: 300 requests, 20 concurrent, seed 40 needs, p95 ≤1000ms, throughput ≥20 req/s, 0 errors. This is a **CI regression threshold**, not global scale proof.
- Build production Docker image with pinned digest bases; no ignored failures.

**Gate R3 – Github required checks**
- Establish that **real** GitHub required check runs are green on the **exact current PR head** (not previously green on a different SHA). Verify automated docs and ownership policy too.
- Review any branch rule requiring human reviews, signed commits, linear history, DCO or code owners.
- Do not bypass check protection, create synthetic green `commit/status` or edit the ruleset. If status check scheduling is blocked for billing, report actionable admin instruction and keep PR open.

**Gate R4 – Merge / subsequent candidate**
- `gh pr merge 71 --merge` only after R0–R3, exact head revalidated and any current conflicts resolved. No force-merging to main.
- Verify merged state and new main SHA/tree in GitHub; rerun main-push CI and generate new accepted candidate **only if full required jobs green**.
- Link new candidate to original frozen SHA in the release ledger as superseding source only; historical GA evidence remains unaltered.
- Ship only after external R5 approval below.

**Gate R5 – External GA certification, tracked #53**
| Gate | Evidence required | Evidence owner |
|---|---|---|
| `stratoid-production` | OIDC registration, key rotation and outage behavior | Identity ops #54 |
| `shared-services-production` | workload identity; SS-18/24/43/44 security and endpoint integration | Platform #55 |
| `yugabytedb-production` | TLS, multi-zone, backup/PITR and dated restore | DB ops #56 |
| `rustfs-production` | TLS, multi-node/failure-domain/retention, recovery and upgrades | Storage ops #57 |
| `media-safety-production` | malware/format scanning, quarantine, moderation and deletion propagation | SS-42 #58 |
| `paycore-production` | **N/A only for pledge-only launch scope**, not PASS | Payments #59 / future scope |
| `mobile-stores` + `appforge-release` | real Apple/Google signing, privacy metadata, distribution evidence | AppForge #51 |
| `security-independent` | independent security testing, issue closure and risk acceptance | Security #60 |
| `device-accessibility` | real Android/iOS devices, assistive tech, low bandwidth/offline | Mobile #61 |
| `skyforge-production` | real deploy, readiness failure modes, canary rollback, network isolation | SkyForge #24 |
| `droplet-independent-verdict` | independent evaluation, no DO_NOT_SHIP/MERGE_BLOCKED | Droplet #10 |
| `operational-readiness` | on-call, incident response, capacity and escalation drills | Ops #62 |
| Legal/privacy/safeguarding | country-specific legal and human approval | #63 |
| Soak and capacity | production-class soak/saturation, restore and rollback | #64 |

Only authorized human owners can sign or waive scoped external gates. `config/ga/external-gates.json` is canonical; re-check identifiers before implementation.

## Evidence manifest shape (proposal, do not forge)
```json
{
  "schema": "irespond.release-candidate-manifest.v2-proposal",
  "releaseTrack": "next-candidate",
  "source": {"repository":"Atlasfsp/iRespond","commit":"<actual SHA>","tree":"<actual tree SHA>"},
  "ci": {"runId":"<actual successful run>","requiredContexts":["mobile","security-boundary","supply-chain","api","deployment","web-contract"],"allPassed":false},
  "artifacts": [{"kind":"api-image","digest":"<actual sha256>"}],
  "externalGates": {"certified":false,"evidenceRefs":[]},
  "ga": false
}
```

**Codex stop conditions:** missing genuine GitHub required check; security vulnerability at high/critical without accepted fix; failing tenant isolation or evidence immutability; undocumented new regulated money movement; missing production service dependencies; unapproved store/access token; conflicting branch state; loss of source-identity traceability.
