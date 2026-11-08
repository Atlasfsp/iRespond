import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StitchBottomNav, StitchTopBar } from '../components/StitchChrome';
import { APIError, apiFetch } from '../lib/api';
import { loadAbilityProfile, type AbilityProfile } from '../lib/drafts';
import { Stitch } from '../lib/stitch-theme';

type Contribution = { kind: string; fulfilled: number; accepted: number };
type Role = { role: string; projects: number };
type ChallengeEntryRecord = {
  id: string;
  programId: string;
  projectTitle: string;
  status: string;
  eligibilityStatus?: string;
  linkedProjectId?: string;
};
type Passport = {
  subject: string;
  projectsLed: number;
  projectsCompleted: number;
  verifications: number;
  fulfilledContributions: number;
  acceptedCommitments: number;
  sdgs: number[];
  contributions: Contribution[];
  roles: Role[];
  generatedAt: string;
};

export default function ImpactPassport() {
  const [data, setData] = useState<Passport | null>(null);
  const [profile, setProfile] = useState<AbilityProfile | null>(null);
  const [challengeEntries, setChallengeEntries] = useState<ChallengeEntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [passport, ability, entries] = await Promise.all([
        apiFetch<Passport>('/v1/me/impact-passport'),
        loadAbilityProfile(),
        apiFetch<ChallengeEntryRecord[]>('/v1/me/challenge-entries').catch(() => []),
      ]);
      setData(passport);
      setProfile(ability);
      setChallengeEntries(Array.isArray(entries) ? entries : []);
    } catch (cause) {
      if (cause instanceof APIError && cause.status === 401) {
        router.replace('/signin');
        return;
      }
      setError('Your verified impact could not be loaded. Check connectivity and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.screen}>
        <StitchTopBar />
        <ScrollView contentContainerStyle={s.content}>
          {loading && (
            <View style={s.center}>
              <ActivityIndicator color={Stitch.color.primary} />
              <Text style={s.muted}>Building your passport…</Text>
            </View>
          )}

          {!!error && (
            <View style={s.error}>
              <Ionicons name="alert-circle-outline" size={24} color={Stitch.color.error} />
              <View style={s.flex}>
                <Text style={s.errorText}>{error}</Text>
                <Pressable onPress={() => void load()} accessibilityRole="button">
                  <Text style={s.link}>Try again</Text>
                </Pressable>
              </View>
            </View>
          )}

          {data && (
            <>
              <View style={s.passportHero}>
                <View style={s.heroGlow} />
                <View style={s.verified}>
                  <Ionicons name="shield-checkmark" size={18} color={Stitch.color.onPrimary} />
                  <Text style={s.verifiedText}>SERVER-EVIDENCED PASSPORT</Text>
                </View>
                <Text style={s.heroEyebrow}>YOUR CONTRIBUTIONS, DOCUMENTED</Text>
                <Text style={s.heroHeading}>Impact Passport</Text>
                <Text style={s.heroSubject}>{data.subject}</Text>
                <Text style={s.heroDescription}>A record of your platform activities and completed responses. Individual activity is not automatically proof of long-term community outcomes.</Text>
              </View>

              <View style={s.card}>
                <Text style={s.section}>Self-declared Ability Profile</Text>
                <Text style={s.muted}>These profile fields are saved on this device and are not server-evidenced.</Text>
                <Text style={s.profileName}>{profile?.displayName || 'No local display name set'}</Text>
                <View style={s.compassRow}>
                  <Compass icon="location-outline" label="Place" value={profile?.place || 'Set profile'} />
                  <Compass icon="people-outline" label="Position" value={profile?.position || 'Set profile'} />
                  <Compass
                    icon="briefcase-outline"
                    label="Possessions"
                    value={profile?.abilities?.length ? `${profile.abilities.length} abilities` : 'Set profile'}
                  />
                </View>
              </View>

              <View style={s.metrics}>
                <Metric icon="flag-outline" label="Projects led" value={data.projectsLed} accent="amber" />
                <Metric icon="checkmark-done-outline" label="Completed" value={data.projectsCompleted} accent="green" />
                <Metric icon="shield-checkmark-outline" label="Verifications" value={data.verifications} accent="green" />
                <Metric icon="hand-left-outline" label="Fulfilled responses" value={data.fulfilledContributions} accent="amber" />
              </View>

              <View style={s.card}>
                <Text style={s.section}>SDG Impact Distribution</Text>
                <Text style={s.muted}>
                  The current API records SDGs touched through verified project work. It does not invent weighted percentages.
                </Text>
                <View style={s.sdgWrap}>
                  {data.sdgs.length ? (
                    data.sdgs.map((number, index) => (
                      <View
                        key={number}
                        style={[s.sdgPill, index % 3 === 0 && s.sdgGreen, index % 3 === 1 && s.sdgAmber]}
                      >
                        <Text style={s.sdgText}>SDG {number}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={s.muted}>No verified project SDGs yet.</Text>
                  )}
                </View>
              </View>

              <View style={s.card}>
                <Text style={s.section}>Verified contribution record</Text>
                {data.contributions.length ? (
                  data.contributions.map((contribution, index) => (
                    <View key={contribution.kind} style={s.contribution}>
                      <View style={[s.contributionIcon, index % 2 ? s.contributionIconAmber : s.contributionIconGreen]}>
                        <Ionicons
                          name={kindIcon(contribution.kind)}
                          size={24}
                          color={index % 2 ? Stitch.color.tertiary : Stitch.color.secondary}
                        />
                      </View>
                      <View style={s.flex}>
                        <Text style={s.contributionTitle}>{human(contribution.kind)}</Text>
                        <Text style={s.muted}>
                          {contribution.fulfilled} fulfilled · {contribution.accepted} accepted/active
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={s.empty}>
                    <Text style={s.emptyTitle}>No accepted contributions yet</Text>
                    <Text style={s.muted}>Accepted and fulfilled contributions will appear here.</Text>
                  </View>
                )}
              </View>

              <View style={s.card}>
                <Text style={s.section}>Leadership & project roles</Text>
                {data.roles.length ? (
                  data.roles.map((role) => (
                    <View key={role.role} style={s.roleRow}>
                      <Text style={s.roleName}>{human(role.role)}</Text>
                      <View style={s.roleCount}>
                        <Text style={s.roleCountText}>{role.projects} project{role.projects === 1 ? '' : 's'}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={s.muted}>Verified project roles will appear here.</Text>
                )}
              </View>

              <View style={s.card}>
                <Text style={s.section}>Challenge entries & verified stages</Text>
                <Text style={s.muted}>
                  Challenge applications, submitted proposals, approved awards, and fulfilled prizes are tracked with separate truth states.
                </Text>
                {challengeEntries.length ? (
                  challengeEntries.map((entry) => (
                    <Pressable
                      key={entry.id}
                      style={s.roleRow}
                      accessibilityRole="button"
                      onPress={() => router.push({ pathname: '/challenges/[id]', params: { id: entry.programId } })}
                    >
                      <View style={s.flex}>
                        <Text style={s.roleName}>{entry.projectTitle || entry.id}</Text>
                        <Text style={s.muted}>
                          Eligibility: {human(entry.eligibilityStatus || 'pending')}
                          {entry.linkedProjectId ? ` · Project ${entry.linkedProjectId}` : ''}
                        </Text>
                      </View>
                      <View style={s.roleCount}>
                        <Text style={s.roleCountText}>{human(entry.status || 'applied')}</Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <Pressable onPress={() => router.push('/challenges')} accessibilityRole="button">
                    <Text style={s.link}>Explore published Challenges →</Text>
                  </Pressable>
                )}
              </View>

              <Pressable style={s.profileButton} onPress={() => router.push('/profile')} accessibilityRole="button">
                <Ionicons name="person-circle-outline" size={23} color={Stitch.color.primaryFixed} />
                <View style={s.flex}>
                  <Text style={s.profileButtonTitle}>Strengthen your Ability Profile</Text>
                  <Text style={s.profileButtonText}>
                    Keep Place, Position and Possessions/capabilities current so matching can improve.
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={22} color={Stitch.color.primaryFixed} />
              </Pressable>

              <Text style={s.foot}>
                Generated {new Date(data.generatedAt).toLocaleString()} · Portable signed credentials remain a separate future capability and are not represented as issued here.
              </Text>
            </>
          )}
        </ScrollView>
        <StitchBottomNav />
      </View>
    </SafeAreaView>
  );
}

function Compass({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={s.compass}>
      <Ionicons name={icon} size={24} color={Stitch.color.primaryFixed} />
      <Text style={s.compassLabel}>{label}</Text>
      <Text numberOfLines={1} style={s.compassValue}>{value}</Text>
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  accent: 'green' | 'amber';
}) {
  return (
    <View style={s.metric}>
      <View style={s.metricHead}>
        <Ionicons name={icon} size={19} color={Stitch.color.onSurfaceVariant} />
        <Text style={s.metricLabel}>{label}</Text>
      </View>
      <Text style={[s.metricValue, accent === 'green' ? s.metricGreen : s.metricAmber]}>{value.toLocaleString()}</Text>
    </View>
  );
}

function kindIcon(kind: string): keyof typeof Ionicons.glyphMap {
  if (kind.includes('logistic') || kind.includes('transport')) return 'car-outline';
  if (kind.includes('skill')) return 'construct-outline';
  if (kind.includes('material')) return 'cube-outline';
  if (kind.includes('fund')) return 'cash-outline';
  return 'hand-left-outline';
}

function human(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Stitch.color.background },
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: Stitch.space.screen, gap: Stitch.space.base, paddingBottom: Stitch.space.xxl },
  center: { alignItems: 'center', paddingVertical: 42, gap: Stitch.space.sm },
  muted: { ...Stitch.type.body, color: Stitch.color.onSurfaceVariant },
  error: { padding: Stitch.space.base, borderRadius: Stitch.radius.lg, backgroundColor: Stitch.color.errorContainer, flexDirection: 'row', gap: Stitch.space.md },
  errorText: { ...Stitch.type.bodyBold, color: Stitch.color.onErrorContainer },
  link: { ...Stitch.type.bodyBold, color: Stitch.color.primary, marginTop: 4 },
  passportHero: { minHeight: 300, padding: Stitch.space.xl, borderRadius: 25, backgroundColor: '#092E3F', overflow: 'hidden', position: 'relative', justifyContent: 'flex-end', gap: Stitch.space.sm },
  heroGlow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -160, right: -80, borderWidth: 52, borderColor: 'rgba(171,235,196,.10)' },
  verified: { alignSelf: 'flex-end', paddingHorizontal: Stitch.space.md, paddingVertical: 8, borderRadius: Stitch.radius.full, backgroundColor: Stitch.color.secondary, flexDirection: 'row', alignItems: 'center', gap: 5 },
  verifiedText: { ...Stitch.type.tag, color: Stitch.color.onPrimary },
  heroEyebrow:{...Stitch.type.eyebrow,color:'#B1E7C9',fontSize:10},
  heroHeading:{fontSize:34,lineHeight:40,letterSpacing:-1,fontWeight:'900',color:'#FFFFFF'},
  heroSubject: { ...Stitch.type.bodyBold, color: '#BCEACF' },
  heroDescription:{...Stitch.type.body,color:'#DCEDE5',fontSize:12,lineHeight:19,maxWidth:320},
  compassRow: { flexDirection: 'row', gap: Stitch.space.sm },
  compass: { flex: 1, minHeight: 78, padding: Stitch.space.sm, borderRadius: Stitch.radius.md, backgroundColor: Stitch.color.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  compassLabel: { ...Stitch.type.tag, color: Stitch.color.onSurfaceVariant, marginTop: 3 },
  compassValue: { ...Stitch.type.footnote, color: Stitch.color.primary, maxWidth: '100%' },
  profileName: { ...Stitch.type.card, color: Stitch.color.onSurface },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Stitch.space.md },
  metric: { width: '47%', flexGrow: 1, padding: Stitch.space.base, borderRadius: 18, backgroundColor: Stitch.color.surfaceLowest, borderWidth: 1, borderColor: '#D9E6E2' },
  metricHead: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  metricLabel: { ...Stitch.type.tag, color: Stitch.color.onSurface },
  metricValue: { ...Stitch.type.stat, marginTop: Stitch.space.md },
  metricGreen: { color: '#176C4C' },
  metricAmber: { color: '#85540B' },
  card: { padding: Stitch.space.card, borderRadius: Stitch.radius.lg, backgroundColor: Stitch.color.surfaceLowest, borderWidth: 1, borderColor: Stitch.color.outlineVariant, gap: Stitch.space.md },
  section: { ...Stitch.type.section, color: Stitch.color.onSurface },
  sdgWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Stitch.space.sm },
  sdgPill: { paddingHorizontal: Stitch.space.md, paddingVertical: 8, borderRadius: Stitch.radius.full, backgroundColor: Stitch.color.primaryFixed },
  sdgGreen: { backgroundColor: Stitch.color.secondaryFixed },
  sdgAmber: { backgroundColor: Stitch.color.tertiaryFixed },
  sdgText: { ...Stitch.type.tag, color: Stitch.color.onSurface },
  contribution: { flexDirection: 'row', alignItems: 'center', gap: Stitch.space.md, paddingVertical: Stitch.space.sm },
  contributionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  contributionIconGreen: { backgroundColor: Stitch.color.secondaryFixed },
  contributionIconAmber: { backgroundColor: Stitch.color.tertiaryFixed },
  contributionTitle: { ...Stitch.type.card, color: Stitch.color.onSurface },
  empty: { padding: Stitch.space.md, borderRadius: Stitch.radius.md, backgroundColor: Stitch.color.surfaceLow },
  emptyTitle: { ...Stitch.type.bodyBold, color: Stitch.color.onSurface },
  roleRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Stitch.color.outlineVariant },
  roleName: { ...Stitch.type.bodyBold, color: Stitch.color.onSurface },
  roleCount: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: Stitch.radius.full, backgroundColor: Stitch.color.surfaceHigh },
  roleCountText: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant },
  profileButton: { minHeight: 88, padding: Stitch.space.base, borderRadius: Stitch.radius.lg, backgroundColor: Stitch.color.primaryContainer, flexDirection: 'row', alignItems: 'center', gap: Stitch.space.md },
  profileButtonTitle: { ...Stitch.type.card, color: Stitch.color.onPrimary },
  profileButtonText: { ...Stitch.type.footnote, color: Stitch.color.onPrimaryContainer, marginTop: 3 },
  foot: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant, textAlign: 'center' },
});
