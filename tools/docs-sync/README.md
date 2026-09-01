# iRespond documentation synchronization service

`tools/docs-sync` keeps interface-dependent training material synchronized with the versioned mobile frontend without giving documentation jobs access to production data or credentials.

## Operating modes

### 1. Source monitor — always available

`npm run fingerprint` hashes every registered screen plus shared mobile routing/session/sync inputs. It separately fingerprints the screen manifest, publication workflow and executable synchronization tooling as the documentation synchronization contract. In CI, `npm run compare` compares both sets of inputs with the accepted baseline loaded from the pull request's base revision or the pre-push main revision—not a baseline modified by the triggering change. When the accepted predecessor has no baseline, CI generates an empty bootstrap baseline so head-controlled hashes cannot be pre-accepted; descriptive bootstrap metadata is retained only after all source, contract and screenshot state is recomputed. A frontend source or synchronization-contract change is sufficient to require publication review even when no render target is available.

After bootstrap, `current-baseline.json` may change only in a `docs-sync/<source-sha>-<run-id>` pull request created by `github-actions[bot]` in this repository. A separate `pull_request_target` workflow is evaluated from the base branch, checks out and executes only accepted-base guard code, and treats the fetched pull-request head solely as diff data. The triggering revision therefore cannot weaken or remove its own ownership check; direct baseline edits from every other branch, repository or author are rejected. Manual workflow dispatch compares against the baseline at the dispatched `github.sha`.

GitHub suppresses ordinary workflow events caused by `GITHUB_TOKEN`, so the publication job explicitly uses the supported `workflow_dispatch` exception after creating a bot PR: it dispatches base-controlled ownership verification on `main` and source verification on the generated branch. The ownership workflow resolves pull-request metadata through GitHub's API and publishes a `docs-baseline-ownership` commit status on the exact PR head.

### 2. Runtime capture — enabled only with a documentation-safe preview

Set `DOCS_CAPTURE_BASE_URL` to a deterministic preview of the current mobile frontend. `npm run capture` uses Playwright Chromium at the viewport pinned in `screen-manifest.json`, grants only deterministic documentation geolocation, verifies an expected text anchor on each route and captures the rendered screen.

Runtime evidence is accepted only after an independent preview revision endpoint confirms the exact expected source SHA. Configure `DOCS_CAPTURE_REVISION_URL`, or the surface-specific `DOCS_CAPTURE_MOBILE_REVISION_URL` and `DOCS_CAPTURE_WEB_REVISION_URL`, to return plain text or JSON containing `sourceRevision`, `gitSha` or `sha`. In local capture, set `DOCS_CAPTURE_EXPECTED_REVISION`; GitHub Actions uses the exact push SHA. A missing, unreachable or mismatched revision endpoint produces current-run diagnostic failures with no accepted `sourceRevision`. Before every attempt, the target screenshot is removed so a failed route can never retain a predecessor image as current evidence. The publication job replays only manifest-registered removals from the transferred change report, which carries those deletions across the artifact boundary without accepting arbitrary paths.

Every entry point validates the screen manifest before capture, comparison or publication. Screen IDs and normalized screenshot targets must be unique, preventing one screen's failure/removal record from deleting another screen's accepted image.

The revision endpoint is checked again after the capture batch. If the preview moved during capture, every image from that surface is discarded. In a source-only run, a file whose digest still matches the accepted baseline may be displayed only as explicitly labeled predecessor evidence tied to `screenshotSourceRevision`; it is never relabeled or advanced as a screenshot of the new source revision.

After attempting all registered screens, the capture command exits successfully after writing the capture report. An unreachable route or changed text anchor is retained in that report as a route or text-anchor review signal so the separate publication job can deliver the incomplete evidence for human review. A missing documentation-safe preview URL still exits non-zero before capture begins. The command never substitutes production tokens, users, evidence or provider accounts. A documentation build may supply `DOCS_CAPTURE_INIT_SCRIPT` to seed a synthetic session in a dedicated capture build; that script must never contain production credentials.

`mock-api.mjs` supplies deterministic synthetic API responses for documentation preview builds that can point `EXPO_PUBLIC_API_BASE_URL` at the local mock server.

## Commands

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run fingerprint -- ../..
node src/mock-api.mjs &
DOCS_CAPTURE_EXPECTED_REVISION=0123456789abcdef0123456789abcdef01234567 \
DOCS_CAPTURE_REVISION_URL=http://127.0.0.1:8081/version \
DOCS_CAPTURE_BASE_URL=http://127.0.0.1:8081 npm run capture -- ../..
npm run compare -- ../..
npm run manual-index -- ../..
```

## Outputs

- `docs/documentation-system/ui-fingerprint.generated.json`
- `docs/documentation-system/runtime-capture.generated.json` when runtime capture is available
- `docs/documentation-system/ui-change-report.generated.json`
- `docs/manuals/generated/ui-interface-baseline.md`
- registered screenshots under `docs/screenshots/current/`

## Pull-request policy

Frontend and synchronization-contract changes must not silently rewrite a published manual. The CI workflow produces a change report on every relevant PR. A relevant main-branch change may create a separate `docs-sync/<sha>` branch containing the updated capture pack and generated manual interface index. Human review remains required before publication.

The initial long-form Word/PDF publications are generated artifacts outside the frozen application candidate. The repository stores the synchronization contract and publication source/baseline metadata; binary publications are released as documentation artifacts rather than being used as application runtime inputs.
