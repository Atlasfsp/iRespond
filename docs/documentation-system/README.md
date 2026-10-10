# iRespond Continuous Documentation System

This directory defines the documentation baseline and the frontend-to-manual synchronization contract for iRespond.

## Baseline

The initial documentation set is pinned to frozen application candidate `6484873c8a0c3306a5972247bcc9981da4051bc6`. Documentation work is intentionally isolated on `docs/comprehensive-documentation-system`; merging it into `main` while the candidate is under external certification would create a new repository SHA and invalidate exact-SHA certification evidence.

The publication set contains:

1. Product Documentation — 127 rendered pages.
2. Technical Documentation — 127 rendered pages.
3. Community Member Training & User Manual — 118 rendered pages.
4. Project Leader & Organization Training/User Manual — 118 rendered pages.
5. Contributor & Funder Training/User Manual — 118 rendered pages.
6. Verification, Safety & Operations Training/User Manual — 118 rendered pages.

Every publication contains rendered diagrams. The role manuals also contain current interface figures derived from the registered mobile screen sources.

## Why the UI documentation is generated

Training material becomes dangerous when screenshots, labels or steps drift away from the application. The documentation sync service therefore treats the mobile interface as versioned input. It fingerprints the registered frontend sources, builds a deterministic documentation capture, compares screenshot hashes, regenerates the manual UI appendix/source map and opens a documentation pull request rather than silently rewriting `main`.

## Truth rules

- A UI change does not automatically change product truth. Manual text must still distinguish current/implemented behavior from target/future behavior.
- A report is not automatically a verified fact, an approved project or a fundraising campaign.
- A pledge is a commitment, not proof of settled money movement.
- CI screenshots are documentation artifacts, not device/store certification evidence.
- No production token, customer record, location, evidence object or reviewer credential is used for documentation capture.
- Mock data must be clearly synthetic and deterministic.

## Sync pipeline

Mermaid source: `docs/documentation-system/diagrams/docs-sync.mmd`.

`frontend change -> source fingerprint -> deterministic Expo capture -> screenshot hash/diff -> regenerate manual sources -> publication QA -> documentation PR`

## Registered interface

See `screen-manifest.json`. The first baseline registers the home/Impact Feed, reporting, evidence, NeedMap, Project Room, counterpart funding, Impact Passport, privacy and Trust & Safety screens.

## Service

Implementation lives in `tools/docs-sync`. The GitHub Actions entrypoint is `.github/workflows/docs-interface-sync.yml`.

The workflow is designed to:

1. run when `apps/mobile/**` changes or on explicit dispatch;
2. start a documentation-only mock API;
3. build the Expo web surface with no production credentials;
4. use a deterministic geolocation and synthetic session for capture;
5. capture every registered route at mobile viewport size;
6. compare image and source fingerprints with the stored baseline;
7. regenerate manual UI source pages and a change report;
8. upload the capture pack on pull requests;
9. on `main` changes, create a short-lived documentation-sync branch and PR when rendered UI changes.

## Publication QA

The long-form Word publications use a render-and-inspect gate. The initial release was rendered through LibreOffice to page PNGs/PDF. Automated full-page checks found no near-blank, unreadable or edge-clipping anomalies. Future rebuilds should preserve the same gate and must fail when a generated document falls below its minimum page threshold.
