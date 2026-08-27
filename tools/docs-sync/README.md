# iRespond living-manual synchronization service

This service makes frontend/manual drift explicit and fail-closed. It does not invent runtime evidence and it does not silently rewrite published manuals.

## Contract

1. `routes.json` maps current mobile route sources to stable screenshot IDs and the manual families that use them.
2. `frontend_fingerprint.py` computes Git-compatible blob fingerprints for every watched route plus shared frontend files. A frontend change makes the mapped screenshot/manual entry stale until the manifest advances.
3. Runtime screenshots must come from an approved iRespond build using a demo/test fixture. Production personal data, secrets and real beneficiary data must never be used for documentation capture.
4. `refresh_manuals.py` ingests only the affected approved PNG captures, records their SHA-256 digests and advances the source fingerprints. It refuses incomplete route coverage and watch-only changes that need a new mapping.
5. `build_manuals.py` regenerates the four long-form manuals from the current repository revision, current approved UI assets and canonical Mermaid sources.
6. CI renders and verifies the outputs, then a documentation PR is reviewed by a human. Publication is never a direct side effect of a frontend commit.

## Typical refresh

```bash
python tools/docs-sync/frontend_fingerprint.py --fail-on-stale
python tools/docs-sync/refresh_manuals.py \
  --screenshots-dir /path/to/approved/appforge-or-device-captures \
  --build
```

The first command intentionally returns non-zero when material is stale. After approved captures are supplied, the second command updates the manifest and rebuilds the affected documentation baseline.

## Screenshot provider boundary

The repository service is provider-neutral. AppForge, an OpenHands runner, an emulator/device farm or a real device may produce the screenshot directory, but the capture must be bound to the exact iRespond source revision. The baseline package for candidate `6484873c8a0c3306a5972247bcc9981da4051bc6` uses source-faithful interface reference renders because this environment cannot claim a real iOS/Android runtime capture. The service is designed to replace affected references with approved runtime screenshots as those captures become available.
