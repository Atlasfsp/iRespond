# iRespond documentation synchronization service

`tools/docs-sync` keeps interface-dependent training material synchronized with the versioned mobile frontend without giving documentation jobs access to production data or credentials.

## Operating modes

### 1. Source monitor — always available

`npm run fingerprint` hashes every registered screen plus shared mobile routing/session/sync inputs. `npm run compare` compares the result with `docs/documentation-system/current-baseline.json`. A source change is sufficient to mark the corresponding manual section for review even when no render target is available.

### 2. Runtime capture — enabled only with a documentation-safe preview

Set `DOCS_CAPTURE_BASE_URL` to a deterministic preview of the current mobile frontend. `npm run capture` uses Playwright Chromium at the viewport pinned in `screen-manifest.json`, grants only deterministic documentation geolocation, verifies an expected text anchor on each route and captures the rendered screen.

The capture command intentionally exits non-zero if a registered screen cannot render. It never substitutes production tokens, users, evidence or provider accounts. A documentation build may supply `DOCS_CAPTURE_INIT_SCRIPT` to seed a synthetic session in a dedicated capture build; that script must never contain production credentials.

`mock-api.mjs` supplies deterministic synthetic API responses for documentation preview builds that can point `EXPO_PUBLIC_API_BASE_URL` at the local mock server.

## Commands

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run fingerprint -- ../..
node src/mock-api.mjs &
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

Frontend changes must not silently rewrite a published manual. The CI workflow produces a change report on every relevant PR. A main-branch frontend change may create a separate `docs-sync/<sha>` branch containing the updated capture pack and generated manual interface index. Human review remains required before publication.

The initial long-form Word/PDF publications are generated artifacts outside the frozen application candidate. The repository stores the synchronization contract and publication source/baseline metadata; binary publications are released as documentation artifacts rather than being used as application runtime inputs.
