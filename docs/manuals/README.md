# iRespond living documentation

The generated documentation set consists of four controlled editions:

- Product Documentation - minimum 100 rendered pages.
- Technical Documentation - minimum 100 rendered pages.
- User Manual for principal user categories - minimum 100 rendered pages.
- Training Manual for principal user categories - minimum 100 rendered pages.

The principal role categories are community member/reporter, responder/volunteer, community organizer/project steward, eligible verifier, NGO/institution/donor, Trust & Safety/safeguarding reviewer, platform administrator/support operator and developer/API integrator.

`ui-screenshot-manifest.json` binds each documented interface image to the exact frontend source fingerprints that produced or justified it. A frontend change that invalidates the binding is a documentation failure until an approved screenshot is captured and the manuals are regenerated. The workflow intentionally distinguishes source-faithful reference imagery from runtime screenshots; only a real app build on an approved capture environment may be labelled runtime evidence.

Canonical Mermaid source belongs under `docs/manuals/mermaid/`. Rendered copies are build outputs and should be regenerated rather than hand-edited.
