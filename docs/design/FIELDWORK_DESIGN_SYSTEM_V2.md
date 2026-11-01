# FIELDWORK v2 — iRespond's community-action design system

**State:** feature-branch design-system candidate, not a production release.
**Branch:** `feat/fieldwork-design-system-v2-20261101`, based on draft Horizon PR #71.
**North star:** **Warmth for people. Clarity for action. Evidence for trust.**
**Product brand:** iRespond. FIELDWORK is a *design system name*, not a replacement corporate identity.

## 1. Artistic direction

iRespond should feel like a meaningful human movement, not a generic enterprise operations console. Ground the system in community participation, kindness and credible public value, but present actual actions with the clarity of a mature operational product.

**Visual references used as principles only, not copied:**

- COMON — approachable volunteer discovery, accessible flows: https://www.behance.net/gallery/252753177/COMON-Case-Study-App-UXUI-Design
- VoluNear — location-based matching and verified opportunities: https://www.behance.net/gallery/245594757/VoluNear-Volunteering-Mobile-App-UIUX-Case-Study
- Fundio — progress, transparency and storytelling: https://www.behance.net/gallery/248432207/Donation-Mobile-App-UX-UI-Case-Study
- Dribbble nonprofit editorial directions and bold typography: https://dribbble.com/shots/27330556-Nonprofit-Website-Design
- Charity dashboard evidence hierarchy and bento architecture: https://dribbble.com/shots/27218218-Donation-Charity-Dashboard-Design

All illustration should be original, licensed or user-provided. Do not copy layouts/assets verbatim. Avoid remote font and marketing tracker dependencies in protected workflows.

## 2. Visual identity

| Role | Token | Color | Use |
| --- | --- | --- | --- |
| Canvas | `--fw-canvas` | `#F8F7F1` | Warm background, reduced glare |
| Paper | `--fw-paper` | `#FFFFFF` | Form panels, cards |
| Deep ink | `--fw-ink` | `#18352A` | Primary text |
| Strong ink | `--fw-strong` | `#102820` | Main headlines |
| Action green | `--fw-leaf` | `#205C45` | Primary actions and high contrast |
| Coral | `--fw-coral` | `#EF7656` | Decorative warmth only |
| Coral text | `coralText` | `#A3432B` | Accessible warm-accent text |
| Sun gold | `--fw-gold` | `#F5CD6C` | Emphasis, caution surface |
| Iris | `--fw-iris` | `#DCD7F7` | Skills and identity surfaces |
| Muted text | `--fw-muted` | `#53685C` | Secondary prose |
| Hairline | `--fw-line` | `#E2E6DB` | Borders and separators |
| Focus | `focus` | `#DA9E2A` | Keyboard focus |

Approximate WCAG contrast on the named backgrounds, verified in a local contrast calculation: ink on canvas **12.37:1**; action green on white **7.84:1**; coral text on pale sage **5.38:1**; muted on white **6.0:1**. Decorative coral on white is only **2.84:1**: *never use it for essential text on white*. Specific component combinations require independent testing.

**Typographic split:** readable sans-serif for navigation, operations and data; restrained editorial serif italics for *select* human/emotional words. Never put critical instructions, error details, identifiers or navigation labels in decorative typography.

**Grid:** 8px base with 4px substeps; 20px mobile margins; responsive 12-column desktop; 1-column primary mobile; radius 13px buttons, 22px cards, 27–31px hero; 44px minimum touch target.

## 3. Core components and behavior

| Component | Visual purpose | Functional contract |
| --- | --- | --- |
| `BrandMark` | Human, recognizable, original mark | Accessible label; not a permission gate |
| `HeroAction` | Editorial message + primary CTA | Real route to NeedMap/Needs; no made-up counts |
| `OpportunityCard` | Category, need, capability, place, state | Only backend-returned need/project IDs in production |
| `EvidenceBadge` | Observed / review / confirmed / disputed | Never collapse all states into "verified" |
| `AbilityCard` | Skills and volunteer intent | Opt-in, explicit consent; local-only fields flagged |
| `ProgressJourney` | See→verify→act→maintain | Status backed by backend, not optimistic animations |
| `ProjectRoomCard` | Governance and milestones | Server-returned project permission envelope |
| `ImpactPassport` | Fulfilled acts and measured outcomes | Separate activity outputs and independently evaluated impact |
| `InlineError` | Recovery and confidence | Human language + actionable retry, never hidden failure |
| `OfflineQueueBanner` | Pending or coordinate-review report | Durable queue and exactly-once/duplicate-safe submit |
| `EmptyState` | Transparent absence of results | No fabricated opportunities |
| `RoleAwareNav` | Relevant routes and organization modes | Backend authorization always remains authoritative |

**State grid:** loading, success, empty, offline, permission denied, stale data, failed request, verified, awaiting review, disputed, safeguarded/private. Each state must have a text label as well as visual affordance. Global validation language must match the backend state machine.

## 4. Interaction and navigation architecture

**Community experience:** Discover → Need detail → Report or contribute → Verify (where authorized) → Project Room → Fulfil → Impact Passport → Maintenance review.

**Institutional experience:** Programme portfolio → project rooms → assign/mobilize → evidence review → measured outcomes → beneficiary feedback → maintenance. New institution features must not masquerade as live until they have real server contracts and audit.

**Trust conditions:** observations are not automatically facts; pledges do not equal payment; role UI does not confer permissions; AI suggestions do not imply verified intervention success. Consent, vulnerable-person privacy and locality shielding govern visibility.

**AI integration (future):** AICO agents can assist with classification, translation, accessible reporting, volunteer matching and outcome analysis only through least-privilege tools and human approval for consequential actions. Disclose AI assistance; attach sources and limitations.

## 5. Responsive specifications

- **Desktop ≥ 1200px:** 247px sidebar, main responsive content, two-column hero with original graphic, three action cards and two evidence panels.
- **Tablet 681–1199px:** collapsed navigation, editorial hero and flexible cards; no horizontally clipped actionable UI.
- **Phone ≤ 680px:** one-column hero; concise accessible CTAs; reduced illustration height; vertical card stack; 44px+ controls and safe-area-aware tab bar in native clients.
- **Reduced motion:** disable nonessential transitions; no animated-only state meaning.
- **Localization:** account for RTL, long language strings, dynamic text scaling and screen-reader announcements.
- **Performance:** avoid third-party images/trackers in core journeys. Lazy-load nonessential art, reserve predictable heights to prevent layout shifting.

## 6. Production integration in this branch

**Implemented:** `apps/web/fieldwork.css` loaded after the canonical layers; browser Home revamped to action-first FIELDWORK hero and content; `apps/mobile/lib/fieldwork-theme.ts`; mobile Home and universal chrome adopt semantic palette while keeping existing routes and offline queue.

**Not yet implemented:** new production backing APIs, full screen-by-screen migration for the complete Stitch catalog, native build verification, institutional ImpactOS/AI agents, global map provider and independent GA certification.

**Canonical guards:** keep 45/45 user-facing API contract ownership, web/mobile execution and reachability checks, server authorization and the frozen external GA boundary. Do not merge to main as a visual-only acceptance.

## 7. Acceptance for design-system adoption

1. Unit/static contracts: token names, legal contrast, required routes, impact-state language, offline review.
2. Visual regression at 390×844, 768×1024, 1440×900; light/dark and large text; verify no horizontal overflow.
3. Screen readers: VoiceOver and TalkBack on actual supported devices; web keyboard and focus; touch target and contrast audit.
4. Safety: no fabricated community need, money settlement or verified outcome; no public location leak; no UI-only auth.
5. App performance: interaction latency, initial meaningful content, demo/provider failure, screen transitions and cold-start behavior.
6. Mobile builds and Android/iOS E2E smoke tests; service contract and external release owners sign off.

**Verdict:** This is a visually substantial, functional *design-system candidate* for staged implementation, not an assertion that every iRespond feature or external release gate is complete.
