import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StitchBottomNav, StitchTopBar } from '../components/StitchChrome';
import { APIError, apiFetch } from '../lib/api';
import { ImpactFlowPalette } from '../lib/impactflow-tokens';
import { Stitch } from '../lib/stitch-theme';

type ChallengeProgram = {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  status: string;
  sponsorName?: string;
  prizeSummary?: string;
  youthSafeguardingRequired?: boolean;
};

type ChallengeEntry = {
  id: string;
  programId: string;
  projectTitle: string;
  status: string;
  eligibilityStatus?: string;
  guardianConsentStatus?: string;
  linkedProjectId?: string;
};

type JudgeAssignment = {
  id: string;
  programId: string;
  roundId: string;
  entryId: string;
  coiStatus: string;
  status: string;
};

const categories = ['All', 'Water', 'Education', 'Health', 'Environment', 'Innovation'] as const;

export default function ChallengesScreen() {
  const [programs, setPrograms] = useState<ChallengeProgram[]>([]);
  const [myEntries, setMyEntries] = useState<ChallengeEntry[]>([]);
  const [myJudgeAssignments, setMyJudgeAssignments] = useState<JudgeAssignment[]>([]);
  const [category, setCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [newTitle, setNewTitle] = useState('Resilient Micro-Watershed Challenge 2026');
  const [newCategory, setNewCategory] = useState('water');
  const [newSummary, setNewSummary] = useState('Community-verified watershed restoration and sensor monitoring.');

  async function load() {
    setNotice('');
    try {
      const [published, entries, assignments] = await Promise.all([
        apiFetch<ChallengeProgram[]>('/v1/challenges', {}, false).catch(() => []),
        apiFetch<ChallengeEntry[]>('/v1/me/challenge-entries').catch(() => []),
        apiFetch<JudgeAssignment[]>('/v1/me/challenge-judge-assignments').catch(() => []),
      ]);
      setPrograms(Array.isArray(published) ? published : []);
      setMyEntries(Array.isArray(entries) ? entries : []);
      setMyJudgeAssignments(Array.isArray(assignments) ? assignments : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createDraftChallenge() {
    setNotice('');
    try {
      const created = await apiFetch<ChallengeProgram>('/v1/challenges', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          summary: newSummary,
          sponsorName: 'Civic Climate Coalition',
          prizeSummary: 'CAD 25,000 + Field Pilot',
          youthSafeguardingRequired: true,
          rounds: [{ sequence: 1, title: 'Round 1 Proposal', startsAt: '2026-01-01T00:00:00Z', closesAt: '2027-12-31T23:59:59Z' }],
          criteria: [
            { code: 'impact', label: 'Community Impact', weightBps: 5000, maxScore: 100 },
            { code: 'feasibility', label: 'Field Feasibility', weightBps: 5000, maxScore: 100 },
          ],
        }),
      });
      setNotice(`Draft challenge ${created.id} created.`);
      await load();
      router.push({ pathname: '/challenges/[id]', params: { id: created.id } });
    } catch (err) {
      if (err instanceof APIError && err.status === 401) {
        router.push('/signin');
        return;
      }
      setNotice(err instanceof Error ? err.message : 'Unable to create draft challenge.');
    }
  }

  const visiblePrograms = category === 'All'
    ? programs
    : programs.filter((item) => String(item.category || '').toLowerCase() === category.toLowerCase());

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.screen}>
        <StitchTopBar />
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
        >
          <View style={s.hero}>
            <Text style={s.eyebrow}>CHALLENGES & INNOVATION</Text>
            <Text style={s.heroTitle}>Solve real community problems with verifiable impact.</Text>
            <Text style={s.heroLead}>
              Every challenge separates applicant entries, conflict-cleared judge scorecards, sponsor commitments, approved awards, and fulfilled prizes.
            </Text>
            <View style={s.heroActions}>
              <Pressable style={s.secondaryBtn} accessibilityRole="button" onPress={() => router.push('/needmap')}>
                <Text style={s.secondaryBtnText}>Explore NeedMap</Text>
              </Pressable>
              <Pressable style={s.secondaryBtn} accessibilityRole="button" onPress={() => router.push('/workspace')}>
                <Text style={s.secondaryBtnText}>Workspace</Text>
              </Pressable>
            </View>
          </View>

          {!!notice && (
            <View style={s.notice}>
              <Text style={s.noticeText}>{notice}</Text>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                accessibilityRole="button"
                accessibilityState={{ selected: category === cat }}
                style={[s.chip, category === cat && s.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[s.chipText, category === cat && s.chipTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator color={ImpactFlowPalette.brandPrimary} />
              <Text style={s.muted}>Loading published challenges…</Text>
            </View>
          ) : (
            <View style={s.list}>
              {visiblePrograms.map((program) => (
                <Pressable
                  key={program.id}
                  accessibilityRole="button"
                  style={s.card}
                  onPress={() => router.push({ pathname: '/challenges/[id]', params: { id: program.id } })}
                >
                  <View style={s.cardHeader}>
                    <View style={s.badgeVerified}>
                      <Text style={s.badgeVerifiedText}>{program.status.toUpperCase()}</Text>
                    </View>
                    {program.youthSafeguardingRequired && (
                      <View style={s.badgeAmber}>
                        <Text style={s.badgeAmberText}>YOUTH SAFEGUARDING</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.cardTitle}>{program.title}</Text>
                  <Text style={s.muted}>{program.summary || 'Open civic innovation challenge.'}</Text>
                  <View style={s.metaRow}>
                    <Text style={s.metaText}>Sponsor: {program.sponsorName || 'Civic Coalition'}</Text>
                    <Text style={s.metaText}>Prize: {program.prizeSummary || 'Recognition'}</Text>
                  </View>
                  <View style={s.ctaRow}>
                    <Text style={s.ctaText}>Open challenge detail →</Text>
                    <Ionicons name="arrow-forward" size={18} color={ImpactFlowPalette.brandPrimary} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>My Challenge Entries ({myEntries.length})</Text>
            {myEntries.length ? (
              myEntries.map((entry) => (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  style={s.rowItem}
                  onPress={() => router.push({ pathname: '/challenges/[id]', params: { id: entry.programId } })}
                >
                  <View style={s.flex}>
                    <Text style={s.rowTitle}>{entry.projectTitle}</Text>
                    <Text style={s.muted}>
                      Status: {entry.status} · Eligibility: {entry.eligibilityStatus || 'pending'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Stitch.color.onSurfaceVariant} />
                </Pressable>
              ))
            ) : (
              <Text style={s.muted}>No entries yet. Select a challenge above to apply.</Text>
            )}
          </View>

          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>My Judge Assignments ({myJudgeAssignments.length})</Text>
            {myJudgeAssignments.length ? (
              myJudgeAssignments.map((ja) => (
                <Pressable
                  key={ja.id}
                  accessibilityRole="button"
                  style={s.rowItem}
                  onPress={() => router.push({ pathname: '/challenges/[id]', params: { id: ja.programId } })}
                >
                  <View style={s.flex}>
                    <Text style={s.rowTitle}>Assignment {ja.id}</Text>
                    <Text style={s.muted}>Entry {ja.entryId} · COI: {ja.coiStatus}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Stitch.color.onSurfaceVariant} />
                </Pressable>
              ))
            ) : (
              <Text style={s.muted}>No active judge assignments for your current role.</Text>
            )}
          </View>

          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>Programme Officer: Create Draft Challenge</Text>
            <Text style={s.muted}>Requires challenge_manager or programme_director role; dual human rule approval required before publication.</Text>
            <Text style={s.label}>Challenge title</Text>
            <TextInput style={s.input} value={newTitle} onChangeText={setNewTitle} accessibilityLabel="Challenge title" />
            <Text style={s.label}>Category</Text>
            <TextInput style={s.input} value={newCategory} onChangeText={setNewCategory} accessibilityLabel="Challenge category" />
            <Text style={s.label}>Summary</Text>
            <TextInput style={s.input} value={newSummary} onChangeText={setNewSummary} accessibilityLabel="Challenge summary" />
            <Pressable style={s.primaryBtn} accessibilityRole="button" onPress={() => void createDraftChallenge()}>
              <Text style={s.primaryBtnText}>Create draft challenge</Text>
            </Pressable>
          </View>
        </ScrollView>
        <StitchBottomNav />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ImpactFlowPalette.bgCanvas },
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  center: { padding: 28, alignItems: 'center', gap: 8 },
  hero: { backgroundColor: ImpactFlowPalette.brandForest, borderRadius: 22, padding: 22, gap: 10 },
  eyebrow: { color: ImpactFlowPalette.accentAmber, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, lineHeight: 30, fontWeight: '800' },
  heroLead: { color: '#DCEAE3', fontSize: 14, lineHeight: 20 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondaryBtn: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center' },
  secondaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  notice: { backgroundColor: ImpactFlowPalette.statusInfoBg, borderRadius: 14, padding: 12 },
  noticeText: { color: ImpactFlowPalette.statusInfoText, fontWeight: '700', fontSize: 13 },
  chipRow: { gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: ImpactFlowPalette.borderDefault, justifyContent: 'center' },
  chipActive: { backgroundColor: ImpactFlowPalette.brandPrimary, borderColor: ImpactFlowPalette.brandPrimary },
  chipText: { color: ImpactFlowPalette.inkPrimary, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#FFFFFF' },
  list: { gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: ImpactFlowPalette.borderDefault, gap: 10 },
  cardHeader: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badgeVerified: { backgroundColor: ImpactFlowPalette.statusVerifiedBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeVerifiedText: { color: ImpactFlowPalette.statusVerifiedText, fontSize: 11, fontWeight: '800' },
  badgeAmber: { backgroundColor: ImpactFlowPalette.accentAmberSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeAmberText: { color: ImpactFlowPalette.accentAmberInk, fontSize: 11, fontWeight: '800' },
  cardTitle: { color: ImpactFlowPalette.inkPrimary, fontSize: 18, fontWeight: '800' },
  muted: { color: ImpactFlowPalette.inkSecondary, fontSize: 13, lineHeight: 19 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  metaText: { color: ImpactFlowPalette.inkMuted, fontSize: 12, fontWeight: '600' },
  ctaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  ctaText: { color: ImpactFlowPalette.brandPrimary, fontWeight: '800', fontSize: 14 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: ImpactFlowPalette.borderDefault, gap: 10 },
  sectionTitle: { color: ImpactFlowPalette.inkPrimary, fontSize: 17, fontWeight: '800' },
  rowItem: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: ImpactFlowPalette.borderDefault, paddingTop: 10 },
  rowTitle: { color: ImpactFlowPalette.inkPrimary, fontSize: 15, fontWeight: '700' },
  label: { color: ImpactFlowPalette.inkPrimary, fontSize: 13, fontWeight: '700' },
  input: { minHeight: 46, borderWidth: 1, borderColor: ImpactFlowPalette.borderStrong, borderRadius: 12, paddingHorizontal: 12, color: ImpactFlowPalette.inkPrimary, backgroundColor: '#FFFFFF' },
  primaryBtn: { minHeight: 48, borderRadius: 12, backgroundColor: ImpactFlowPalette.brandPrimary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
