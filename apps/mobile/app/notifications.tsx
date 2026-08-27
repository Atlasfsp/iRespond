import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { StitchBottomNav, StitchTopBar } from '../components/StitchChrome';
import { APIError, apiFetch, putJSON } from '../lib/api';
import { Stitch } from '../lib/stitch-theme';

type Notice = {
  id: string;
  category: string;
  title: string;
  body: string;
  resourceType?: string;
  resourceId?: string;
  readAt?: string;
  createdAt: string;
};

type Preferences = {
  inApp: boolean;
  push: boolean;
  sms: boolean;
  email: boolean;
  updatedAt?: string;
};

const defaults: Preferences = { inApp: true, push: true, sms: false, email: false };
const filters = ['All', 'Action Required', 'Verified', 'Project'] as const;
type Filter = (typeof filters)[number];

export default function Notifications() {
  const [items, setItems] = useState<Notice[]>([]);
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [filter, setFilter] = useState<Filter>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [notices, preferences] = await Promise.all([
        apiFetch<Notice[]>('/v1/me/notifications'),
        apiFetch<Preferences>('/v1/me/notification-preferences'),
      ]);
      setItems(notices);
      setPrefs(preferences);
    } catch (cause) {
      if (cause instanceof APIError && cause.status === 401) {
        router.replace('/signin');
        return;
      }
      setError('Your notifications could not be loaded. Check connectivity and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(next: Preferences) {
    const previous = prefs;
    setPrefs(next);
    setSaving(true);
    setError('');
    try {
      const saved = await putJSON<Preferences>('/v1/me/notification-preferences', next);
      setPrefs(saved);
    } catch (cause) {
      setPrefs(previous);
      if (cause instanceof APIError && cause.status === 401) {
        router.replace('/signin');
        return;
      }
      setError('Your notification preferences could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function markRead(item: Notice) {
    if (item.readAt) return;
    try {
      const updated = await apiFetch<Notice>(`/v1/me/notifications/${encodeURIComponent(item.id)}/read`, {
        method: 'POST',
      });
      setItems((current) => current.map((notice) => (notice.id === updated.id ? updated : notice)));
    } catch (cause) {
      if (cause instanceof APIError && cause.status === 401) {
        router.replace('/signin');
      }
      // Preserve the unread state if the operation cannot be confirmed.
    }
  }

  async function markAll() {
    for (const item of items.filter((notice) => !notice.readAt)) {
      await markRead(item);
    }
  }

  const unread = items.filter((item) => !item.readAt).length;
  const visible = useMemo(() => items.filter((item) => matches(filter, item)), [items, filter]);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.screen}>
        <StitchTopBar />
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.header}>
            <View style={s.headerCopy}>
              <Text style={s.eyebrow}>NOTIFICATION CENTER</Text>
              <Text style={s.title}>Stay connected to action that needs you.</Text>
              <Text style={s.intro}>{unread} unread · Tap an unread notification to mark it read.</Text>
            </View>
            <Pressable
              style={[s.markAll, unread === 0 && s.disabled]}
              disabled={unread === 0}
              onPress={() => void markAll()}
              accessibilityRole="button"
            >
              <Text style={s.markAllText}>Mark all as read</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filters}
          >
            {filters.map((value) => (
              <Pressable
                key={value}
                style={[s.filter, value === filter && s.filterOn]}
                onPress={() => setFilter(value)}
                accessibilityRole="button"
                accessibilityState={{ selected: value === filter }}
              >
                <Text style={[s.filterText, value === filter && s.filterTextOn]}>{value}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {loading && (
            <View style={s.center}>
              <ActivityIndicator color={Stitch.color.primary} />
              <Text style={s.muted}>Loading notifications…</Text>
            </View>
          )}

          {!!error && (
            <View style={s.error}>
              <Ionicons name="alert-circle-outline" size={23} color={Stitch.color.error} />
              <View style={s.flex}>
                <Text style={s.errorText}>{error}</Text>
                <Pressable onPress={() => void load()} accessibilityRole="button">
                  <Text style={s.link}>Try again</Text>
                </Pressable>
              </View>
            </View>
          )}

          {!loading && !error && visible.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="notifications-off-outline" size={34} color={Stitch.color.onSurfaceVariant} />
              <Text style={s.emptyTitle}>Nothing in this view</Text>
              <Text style={s.muted}>
                Project decisions, verification requests and response milestones will appear here.
              </Text>
            </View>
          )}

          {visible.map((item) => {
            const tone = toneFor(item);
            return (
              <Pressable
                key={item.id}
                style={[s.card, !item.readAt && s.cardUnread, tone === 'danger' && s.cardDanger]}
                onPress={() => void markRead(item)}
                accessibilityRole="button"
              >
                <View style={[s.accent, tone === 'danger' && s.accentDanger, tone === 'green' && s.accentGreen]} />
                <View style={[s.iconWrap, tone === 'danger' && s.iconDanger, tone === 'green' && s.iconGreen]}>
                  <Ionicons
                    name={iconFor(item)}
                    size={25}
                    color={tone === 'danger' ? Stitch.color.error : tone === 'green' ? Stitch.color.secondary : Stitch.color.primary}
                  />
                </View>
                <View style={s.flex}>
                  <View style={s.cardHead}>
                    <Text style={s.cardTitle}>{item.title}</Text>
                    <Text style={s.time}>{relative(item.createdAt)}</Text>
                  </View>
                  <Text style={s.body}>{item.body}</Text>
                  <View style={s.cardMeta}>
                    <Text style={s.category}>{human(item.category || 'update')}</Text>
                    {!item.readAt && <View style={s.unreadDot} />}
                  </View>
                </View>
              </Pressable>
            );
          })}

          <View style={s.prefCard}>
            <View style={s.prefHead}>
              <Ionicons name="options-outline" size={22} color={Stitch.color.primary} />
              <View style={s.flex}>
                <Text style={s.section}>Delivery preferences</Text>
                <Text style={s.muted}>Control how governed notification intents can reach you.</Text>
              </View>
            </View>
            <Toggle
              label="In-app inbox"
              help="Always keep an auditable in-app copy."
              value={prefs.inApp}
              disabled={saving}
              onChange={(value) => void save({ ...prefs, inApp: value })}
            />
            <Toggle
              label="Push notifications"
              help="Immediate mobile alerts where enabled."
              value={prefs.push}
              disabled={saving}
              onChange={(value) => void save({ ...prefs, push: value })}
            />
            <Toggle
              label="SMS"
              help="Shared delivery service; consent and suppression still apply."
              value={prefs.sms}
              disabled={saving}
              onChange={(value) => void save({ ...prefs, sms: value })}
            />
            <Toggle
              label="Email"
              help="Useful for summaries and institutional follow-up."
              value={prefs.email}
              disabled={saving}
              onChange={(value) => void save({ ...prefs, email: value })}
            />
          </View>
        </ScrollView>
        <StitchBottomNav />
      </View>
    </SafeAreaView>
  );
}

function Toggle({
  label,
  help,
  value,
  onChange,
  disabled,
}: {
  label: string;
  help: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <View style={s.toggle}>
      <View style={s.flex}>
        <Text style={s.toggleLabel}>{label}</Text>
        <Text style={s.toggleHelp}>{help}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: '#CCD1D6', true: Stitch.color.primaryContainer }}
        thumbColor={Stitch.color.surfaceLowest}
      />
    </View>
  );
}

function matches(filter: Filter, item: Notice) {
  if (filter === 'All') return true;
  const value = `${item.category} ${item.title} ${item.body}`.toLowerCase();
  if (filter === 'Action Required') return /action|required|urgent|request|review/.test(value);
  if (filter === 'Verified') return /verified|verification|validated|approved/.test(value);
  return /project|milestone|resource|contribution/.test(value);
}

function toneFor(item: Notice): 'danger' | 'green' | 'navy' {
  const value = `${item.category} ${item.title}`.toLowerCase();
  if (/urgent|safety|action|required|alert/.test(value)) return 'danger';
  if (/verified|validated|complete|credential/.test(value)) return 'green';
  return 'navy';
}

function iconFor(item: Notice): keyof typeof Ionicons.glyphMap {
  const value = `${item.category} ${item.title}`.toLowerCase();
  if (/verified|verification/.test(value)) return 'shield-checkmark-outline';
  if (/project|resource/.test(value)) return 'archive-outline';
  if (/urgent|safety|action|required|alert/.test(value)) return 'warning-outline';
  if (/credential|impact/.test(value)) return 'ribbon-outline';
  return 'information-circle-outline';
}

function relative(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return new Date(value).toLocaleString();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

function human(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Stitch.color.background },
  screen: { flex: 1 },
  content: { padding: Stitch.space.screen, gap: Stitch.space.md, paddingBottom: Stitch.space.xxl },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Stitch.space.md },
  headerCopy: { flex: 1 },
  flex: { flex: 1 },
  eyebrow: { ...Stitch.type.eyebrow, color: Stitch.color.primary },
  title: { ...Stitch.type.hero, color: Stitch.color.primary, marginTop: 4 },
  intro: { ...Stitch.type.body, color: Stitch.color.onSurfaceVariant, marginTop: 5 },
  markAll: {
    minHeight: 44,
    maxWidth: 118,
    paddingHorizontal: Stitch.space.md,
    borderRadius: Stitch.radius.full,
    borderWidth: 1,
    borderColor: Stitch.color.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Stitch.color.surfaceLowest,
  },
  disabled: { opacity: 0.45 },
  markAllText: { ...Stitch.type.tag, color: Stitch.color.primary, textAlign: 'center' },
  filters: { gap: Stitch.space.sm, paddingRight: Stitch.space.screen },
  filter: {
    minHeight: 44,
    paddingHorizontal: Stitch.space.lg,
    borderRadius: Stitch.radius.full,
    borderWidth: 1,
    borderColor: Stitch.color.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Stitch.color.surfaceLowest,
  },
  filterOn: { backgroundColor: Stitch.color.primary, borderColor: Stitch.color.primary },
  filterText: { ...Stitch.type.bodyBold, color: Stitch.color.onSurface },
  filterTextOn: { color: Stitch.color.onPrimary },
  center: { alignItems: 'center', paddingVertical: 32, gap: Stitch.space.sm },
  muted: { ...Stitch.type.body, color: Stitch.color.onSurfaceVariant },
  error: {
    padding: Stitch.space.base,
    borderRadius: Stitch.radius.lg,
    backgroundColor: Stitch.color.errorContainer,
    flexDirection: 'row',
    gap: Stitch.space.md,
  },
  errorText: { ...Stitch.type.bodyBold, color: Stitch.color.onErrorContainer },
  link: { ...Stitch.type.bodyBold, color: Stitch.color.primary, marginTop: 4 },
  empty: {
    padding: Stitch.space.xl,
    borderRadius: Stitch.radius.lg,
    borderWidth: 1,
    borderColor: Stitch.color.outlineVariant,
    alignItems: 'center',
    gap: Stitch.space.sm,
    backgroundColor: Stitch.color.surfaceLowest,
  },
  emptyTitle: { ...Stitch.type.card, color: Stitch.color.onSurface },
  card: {
    minHeight: 150,
    padding: Stitch.space.base,
    paddingLeft: Stitch.space.xl,
    borderRadius: Stitch.radius.lg,
    borderWidth: 1,
    borderColor: Stitch.color.outlineVariant,
    backgroundColor: Stitch.color.surfaceLowest,
    flexDirection: 'row',
    gap: Stitch.space.md,
    position: 'relative',
    overflow: 'hidden',
  },
  cardUnread: { backgroundColor: '#FBFCFE' },
  cardDanger: { borderColor: '#FFB4AB' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: Stitch.color.amber },
  accentDanger: { backgroundColor: Stitch.color.error },
  accentGreen: { backgroundColor: Stitch.color.secondary },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Stitch.color.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: { backgroundColor: Stitch.color.errorContainer },
  iconGreen: { backgroundColor: Stitch.color.secondaryFixed },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', gap: Stitch.space.sm },
  cardTitle: { flex: 1, ...Stitch.type.card, color: Stitch.color.onSurface },
  time: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant },
  body: { ...Stitch.type.body, color: Stitch.color.onSurfaceVariant, marginTop: 5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Stitch.space.sm, marginTop: Stitch.space.md },
  category: { ...Stitch.type.footnote, color: Stitch.color.primary },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Stitch.color.secondary },
  prefCard: {
    padding: Stitch.space.card,
    borderRadius: Stitch.radius.lg,
    borderWidth: 1,
    borderColor: Stitch.color.outlineVariant,
    backgroundColor: Stitch.color.surfaceLowest,
    gap: Stitch.space.sm,
  },
  prefHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Stitch.space.md, marginBottom: Stitch.space.sm },
  section: { ...Stitch.type.section, color: Stitch.color.primary },
  toggle: {
    minHeight: 68,
    paddingVertical: Stitch.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Stitch.space.md,
    borderTopWidth: 1,
    borderTopColor: Stitch.color.surfaceHigh,
  },
  toggleLabel: { ...Stitch.type.bodyBold, color: Stitch.color.onSurface },
  toggleHelp: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant, marginTop: 2 },
});
