# FIELDWORK browser accessibility regression

The browser regression uses an isolated local demo session and synthetic records.
It does not call an institution, certify the native app, or establish field evidence.

With workspace dependencies installed, serve `apps/web` on loopback port 4173 and run:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory apps/web
# In a separate terminal:
node tools/ci/fieldwork-label-accessibility.mjs
```

`CHROME_PATH` selects a locally installed Chrome executable, `WEB_URL` selects the
local server and `EVIDENCE_DIR` selects the receipt directory. The script checks 11
canonical authenticated demo routes at 390×844, 768×1024 and 1440×900 for unlabeled
controls, horizontal overflow, browser runtime errors and axe-core 4.14.0 WCAG
A/AA rule violations. Incomplete axe findings are preserved for human review.

The regression caught unassociated form labels, unnamed privacy-consent selectors,
low-contrast mobile navigation, a dark sign-out button with dark text, and muted
home-page text. Controls now use native wrapping labels, including repeated forms,
without generating duplicate IDs or relying on a DOM observer.

Automated checks cover rendered initial states only. Open project detail forms,
error/empty/offline states, catalog screens, native assistive technology, keyboard
usability, screen readers, and independent accessibility review still require
additional acceptance evidence. Passing this check is not WCAG certification.
