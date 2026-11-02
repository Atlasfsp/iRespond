import { Fieldwork } from './fieldwork-theme.ts';

// Compatibility adapter: existing screens retain their semantic API.
export const Stitch = {
  color: {
    background: Fieldwork.color.canvas,
    surface: Fieldwork.color.canvas,
    surfaceLowest: Fieldwork.color.paper,
    surfaceLow: Fieldwork.color.leafSoft,
    surfaceContainer: '#ECEEF1',
    surfaceHigh: '#E6E8EB',
    surfaceHighest: '#E0E3E6',
    onSurface: Fieldwork.color.ink,
    onSurfaceVariant: Fieldwork.color.muted,
    outline: '#73777E',
    outlineVariant: '#C3C7CE',
    primary: Fieldwork.color.leaf,
    primaryContainer: Fieldwork.color.leafPressed,
    onPrimary: Fieldwork.color.textOnLeaf,
    onPrimaryContainer: Fieldwork.color.leafSoft,
    primaryFixed: Fieldwork.color.leafSoft,
    secondary: Fieldwork.color.leaf,
    secondaryContainer: Fieldwork.color.verifiedSurface,
    onSecondaryContainer: Fieldwork.color.verified,
    secondaryFixed: Fieldwork.color.leafSoft,
    secondaryFixedDim: '#8AD6AC',
    tertiary: '#312000',
    tertiaryContainer: '#4D3400',
    tertiaryFixed: Fieldwork.color.goldSoft,
    tertiaryFixedDim: '#FABC4A',
    amber: Fieldwork.color.gold,
    actionMint: Fieldwork.color.leafSoft,
    error: Fieldwork.color.disputed,
    errorContainer: Fieldwork.color.disputedSurface,
    onErrorContainer: Fieldwork.color.disputed
  },
  space: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, screen: 20, gutter: 14, card: 16 },
  radius: { sm: 4, base: 8, md: 12, lg: 16, hero: 24, full: 999 },
  type: {
    hero: { fontSize: 30, lineHeight: 36, fontWeight: '900' as const, letterSpacing: -0.6 },
    headline: { fontSize: 24, lineHeight: 30, fontWeight: '900' as const, letterSpacing: -0.36 },
    section: { fontSize: 19, lineHeight: 25, fontWeight: '800' as const, letterSpacing: -0.19 },
    card: { fontSize: 17, lineHeight: 24, fontWeight: '800' as const },
    body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
    bodyBold: { fontSize: 15, lineHeight: 22, fontWeight: '700' as const },
    stat: { fontSize: 28, lineHeight: 34, fontWeight: '900' as const, letterSpacing: -0.56 },
    eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: '900' as const, letterSpacing: 1.65 },
    tag: { fontSize: 12, lineHeight: 16, fontWeight: '800' as const },
    footnote: { fontSize: 11, lineHeight: 17, fontWeight: '500' as const }
  },
  control: { minHeight: 44, primaryHeight: 52 }
} as const;
