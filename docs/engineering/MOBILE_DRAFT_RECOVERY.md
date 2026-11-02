# Evidence draft recovery

Reopening the mobile Evidence screen previously initialized an empty attachment
list. Saving or submitting could replace a saved draft's evidence URIs with that
empty list. The screen now restores draft attachments before enabling capture,
save or submission, preserves stored bytes on a restore failure, and offers retry.
It also exposes button roles, busy/disabled state and evidence image descriptions.

Regression: export the Expo app for web in isolated demo mode, serve the export
with SPA fallback on loopback port 4174, then run:

```sh
node tools/ci/mobile-evidence-draft-recovery.mjs
```

The test uses a synthetic one-pixel image and local browser storage. It verifies
reopened attachments survive saving, corrupted storage blocks save and submission
without overwriting bytes, and retry restores the corrected draft. The original
reopening check failed before the fix. TypeScript validation and a fresh Expo web
export also pass. This does not establish camera permissions, native filesystem
persistence, physical-device recovery or field validation; those require separate
native acceptance evidence. Historical Android captures predate this change.
