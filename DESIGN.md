> **Approved visual authority:** `references/ImpactFlow_Direction_01_User_Approved.jpeg` (and `references/ImpactFlow_Approved_Visual_Concept.png`) defines the approved ImpactFlow Design Direction 01 composition. All people, metrics, names, cards and award events in the concept image are illustrative; production UI must use authorized server records or explicit `OFFLINE DEMO` / design-only labels.

# DESIGN.md — iRespond ImpactFlow v1 & Canonical Frontend Guidelines

## 1. Design Intent & Architecture Coexistence

ImpactFlow v1 unifies iRespond's community platform, NeedMap, Action Projects, volunteer contributions, Impact Passport, Challenges, and institutional workspaces under the approved forest-green, action-green, warm-amber, and chalk-canvas visual language while preserving:
- Single web runtime (`apps/web/app.js`, never `app-v2.js`)
- Expo Router mobile screens (`apps/mobile/app/**`) and 5-tab bottom navigation (`Home`, `Actions`, `Report`, `Impact`, `Profile`)
- The 77 supplied Stitch screen contracts (`docs/frontend/STITCH_SOURCE_MANIFEST.json`) and FIELDWORK v2 compatibility tokens (`docs/design/FIELDWORK_DESIGN_SYSTEM_V2.md`).

## 2. Approved Palette & Contrast Rules

| Token | Value | Usage & Contrast Rule |
|---|---|---|
| `--if-color-brand-forest` / `color.brand.forest` | `#123E34` | Desktop sidebar, hero surfaces, inverse cards (`#FFFFFF` text = 11.9:1 PASS) |
| `--if-color-action-primary` / `color.action.primary` | `#0A6C50` | Primary CTA buttons with `#FFFFFF` text (6.41:1 AA PASS) |
| `--if-color-brand-action` / `color.brand.action` | `#24A27B` | Brand accent, icons, active indicators, dark-ink badges (`#1E293B` text = 4.55:1 PASS; **NEVER white normal text**) |
| `--if-color-brand-amber` / `color.brand.amber` | `#F2B84B` | Urgency/highlight badges and accents with `#1E293B` ink (8.17:1 PASS; **NEVER white normal text**) |
| `--if-color-surface-canvas` / `color.surface.canvas` | `#F7F6F0` | Warm page background canvas (`#1E293B` text = 13.51:1 PASS) |
| `--if-color-surface-base` / `color.surface.base` | `#FFFFFF` | Card, table, and form field surface |
| `--if-color-text-primary` / `color.text.primary` | `#1E293B` | Primary body and heading ink |
| `--if-color-text-secondary` / `color.text.secondary` | `#44625A` | Secondary explanatory copy (6.69:1 on white PASS) |
| `--if-color-border-default` / `color.border.default` | `#DDE7E1` | Hairline card and control borders |
| `--if-color-action-focus` / `color.action.focus` | `#0B7454` | Visible `:focus-visible` ring on light surfaces (5.77:1 >= 3:1 PASS) |

## 3. Typography, Layout & Accessibility

- **Typography:** `Manrope` (700–800) for expressive headings, `Inter` (400/500/600/700) for functional UI and body copy, with system sans-serif fallbacks and `tabular-nums` on financial/impact metrics.
- **Scale & Zoom:** Fluid desktop-to-mobile type scale supporting 200% browser text zoom and OS dynamic type without clipping or horizontal overflow.
- **Spacing & Radii:** `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80px` spacing scale; `12px` controls, `18px` cards, `24px` hero containers, `20px` modals, `999px` pills.
- **Touch & Focus:** Minimum `44×44px` interactive hit targets (`48–52px` primary buttons/inputs), explicit label-to-control association, keyboard navigation, and `prefers-reduced-motion` support.

## 4. Product Truth Boundaries (Non-Negotiable)

- **Observation != Verified Need:** Reports remain observations until transitioned by an independent authorized verifier.
- **Pledge != Settled Money:** Funding and sponsor pledges are commitments, never represented as collected or settled cash without external PayCore confirmation.
- **Judge Score != Verified Outcome & Award != Fulfilled Prize:** Competition scores, award selections, and prize delivery are distinct server-authoritative states.
- **Server-Enforced Authority:** Role menus and feature flags are navigation aids only; all global and resource permissions are enforced by the Go API, StratoID OIDC, and SS-13 policy decisions.
