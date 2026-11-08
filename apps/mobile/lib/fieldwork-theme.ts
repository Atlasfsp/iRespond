import { ImpactFlow } from './impactflow-tokens.ts';

/** iRespond ImpactFlow v1 + FIELDWORK v2 compatibility adapter — semantic tokens, not API authority.
 * Bridges the approved ImpactFlow palette (#123E34 forest, #0A6C50 action button, #24A27B accent,
 * #F2B84B amber, #F7F6F0 canvas, #1E293B ink) to all existing Stitch and Fieldwork consumers.
 */
export { ImpactFlow };

export const Fieldwork = {
  brand: {
    name: 'ImpactFlow',
    statement: 'Better together.',
    doctrine: 'See it. Own it. Solve it. Prove the impact.',
  },
  color: {
    canvas: ImpactFlow.color.surface.canvas,
    paper: ImpactFlow.color.surface.base,
    ink: ImpactFlow.color.text.primary,
    inkStrong: ImpactFlow.color.brand.forest,
    muted: ImpactFlow.color.text.secondary,
    border: ImpactFlow.color.border.default,
    leaf: ImpactFlow.color.action.primary,
    leafPressed: ImpactFlow.color.action.pressed,
    leafSoft: ImpactFlow.color.status.successSurface,
    actionAccent: ImpactFlow.color.brand.action,
    coral: '#EF7656',
    coralText: '#A3432B',
    coralSoft: '#FCE7DF',
    gold: ImpactFlow.color.brand.amber,
    goldText: ImpactFlow.color.status.warning,
    goldSoft: ImpactFlow.color.status.warningSurface,
    iris: '#E9F4FA',
    irisText: ImpactFlow.color.status.info,
    verified: ImpactFlow.color.status.success,
    verifiedSurface: ImpactFlow.color.status.successSurface,
    observed: ImpactFlow.color.status.warning,
    observedSurface: ImpactFlow.color.status.warningSurface,
    disputed: ImpactFlow.color.status.danger,
    disputedSurface: ImpactFlow.color.status.dangerSurface,
    focus: ImpactFlow.color.action.focus,
    textOnLeaf: ImpactFlow.color.action.onPrimary,
    textOnPaper: ImpactFlow.color.text.primary,
  },
  radius: {
    card: ImpactFlow.radius.card,
    hero: ImpactFlow.radius.hero,
    button: ImpactFlow.radius.control,
    pill: ImpactFlow.radius.pill,
    icon: 14,
  },
  space: {
    screen: ImpactFlow.layout.mobileGutter,
    card: ImpactFlow.space['5'],
    section: ImpactFlow.space['6'],
    button: 14,
  },
  type: {
    display: { fontSize: 32, lineHeight: 38, fontWeight: '800' as const, letterSpacing: -0.9 },
    title: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const, letterSpacing: -0.5 },
    card: { fontSize: 18, lineHeight: 25, fontWeight: '700' as const, letterSpacing: -0.25 },
    body: { fontSize: 15, lineHeight: 23, fontWeight: '400' as const },
    eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: '800' as const, letterSpacing: 1.1 },
  },
  control: {
    minTarget: ImpactFlow.control.touchMin,
    primaryHeight: ImpactFlow.control.primaryHeight,
  },
  states: {
    observed: { label: 'Observed, not verified', tone: 'observed' },
    verification_requested: { label: 'Review requested', tone: 'observed' },
    community_confirmed: { label: 'Community-confirmed', tone: 'verified' },
    institution_confirmed: { label: 'Institution-confirmed', tone: 'verified' },
    expert_confirmed: { label: 'Expert-confirmed', tone: 'verified' },
    independently_audited: { label: 'Independently audited', tone: 'verified' },
    government_confirmed: { label: 'Government-confirmed', tone: 'verified' },
    disputed: { label: 'Disputed', tone: 'disputed' },
    rejected: { label: 'Rejected', tone: 'disputed' },
  },
} as const;
