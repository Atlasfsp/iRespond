import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ImpactFlow, IMPACTFLOW_NATIVE_CATALOG } from '../lib/impactflow-tokens';

export { IMPACTFLOW_NATIVE_CATALOG };

export type IFStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'amber' | 'forest';

/** IF-13: StatusPill — pairs non-colour icon + explicit server-backed text */
export function IFStatusPill({
  label,
  tone = 'info',
  icon,
}: {
  label: string;
  tone?: IFStatusTone;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const palette = {
    success: { bg: ImpactFlow.color.status.successSurface, fg: ImpactFlow.color.status.success, defaultIcon: 'checkmark-circle-outline' as const },
    warning: { bg: ImpactFlow.color.status.warningSurface, fg: ImpactFlow.color.status.warning, defaultIcon: 'time-outline' as const },
    danger: { bg: ImpactFlow.color.status.dangerSurface, fg: ImpactFlow.color.status.danger, defaultIcon: 'alert-circle-outline' as const },
    info: { bg: ImpactFlow.color.status.infoSurface, fg: ImpactFlow.color.status.info, defaultIcon: 'information-circle-outline' as const },
    amber: { bg: ImpactFlow.color.brand.amber, fg: ImpactFlow.color.brand.ink, defaultIcon: 'sparkles-outline' as const },
    forest: { bg: ImpactFlow.color.action.primary, fg: ImpactFlow.color.action.onPrimary, defaultIcon: 'trophy-outline' as const },
  }[tone];

  return (
    <View style={[s.pill, { backgroundColor: palette.bg }]} accessibilityRole="text">
      <Ionicons name={icon ?? palette.defaultIcon} size={14} color={palette.fg} />
      <Text style={[s.pillText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

/** IF-07: FilterChipBar */
export function IFFilterChipBar<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={s.chipRow} accessibilityRole="tablist">
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            onPress={() => onSelect(opt.value)}
            style={[s.chip, active && s.chipActive]}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** IF-17: ImpactMetric */
export function IFImpactMetric({
  value,
  label,
  provenance,
  icon = 'ribbon-outline',
}: {
  value: string | number;
  label: string;
  provenance?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={s.metricCard} accessibilityRole="summary">
      <Ionicons name={icon} size={20} color={ImpactFlow.color.action.primary} />
      <Text style={s.metricValue}>{String(value)}</Text>
      <Text style={s.metricLabel}>{label}</Text>
      {provenance ? <Text style={s.metricProvenance}>{provenance}</Text> : null}
    </View>
  );
}

/** IF-18: TrustNotice */
export function IFTrustNotice({
  title,
  body,
  tone = 'warning',
}: {
  title: string;
  body: string;
  tone?: 'warning' | 'info' | 'success' | 'danger';
}) {
  const surface = {
    warning: { bg: ImpactFlow.color.status.warningSurface, fg: ImpactFlow.color.status.warning },
    info: { bg: ImpactFlow.color.status.infoSurface, fg: ImpactFlow.color.status.info },
    success: { bg: ImpactFlow.color.status.successSurface, fg: ImpactFlow.color.status.success },
    danger: { bg: ImpactFlow.color.status.dangerSurface, fg: ImpactFlow.color.status.danger },
  }[tone];
  return (
    <View style={[s.notice, { backgroundColor: surface.bg }]} accessibilityRole="text">
      <Ionicons name="shield-checkmark-outline" size={18} color={surface.fg} />
      <View style={s.flex}>
        <Text style={[s.noticeTitle, { color: surface.fg }]}>{title}</Text>
        <Text style={[s.noticeBody, { color: surface.fg }]}>{body}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ImpactFlow.radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: ImpactFlow.fontSize.caption,
    lineHeight: ImpactFlow.lineHeight.caption,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: ImpactFlow.control.touchMin,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: ImpactFlow.radius.pill,
    backgroundColor: ImpactFlow.color.surface.base,
    borderWidth: 1,
    borderColor: ImpactFlow.color.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: ImpactFlow.color.action.primary,
    borderColor: ImpactFlow.color.action.primary,
  },
  chipText: {
    fontSize: ImpactFlow.fontSize.label,
    color: ImpactFlow.color.text.secondary,
    fontWeight: '700',
  },
  chipTextActive: {
    color: ImpactFlow.color.action.onPrimary,
  },
  metricCard: {
    flex: 1,
    minWidth: 94,
    padding: 12,
    borderRadius: ImpactFlow.radius.card,
    backgroundColor: ImpactFlow.color.surface.base,
    borderWidth: 1,
    borderColor: ImpactFlow.color.border.default,
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: ImpactFlow.color.text.primary,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: ImpactFlow.color.text.secondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  metricProvenance: {
    fontSize: 10,
    lineHeight: 14,
    color: ImpactFlow.color.text.tertiary,
    textAlign: 'center',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: ImpactFlow.radius.control,
  },
  noticeTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
});
