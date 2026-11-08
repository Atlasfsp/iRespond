import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StitchBottomNav, StitchTopBar } from '../../components/StitchChrome';
import { APIError, apiFetch } from '../../lib/api';
import { ImpactFlowPalette } from '../../lib/impactflow-tokens';

type ChallengeDetail = {
  program: {
    id: string;
    title: string;
    category?: string;
    summary?: string;
    description?: string;
    status: string;
    rulesVersion?: number;
    ruleApprovalsCount?: number;
    youthSafeguardingRequired?: boolean;
    sponsorName?: string;
    prizeSummary?: string;
  };
  rounds?: { id: string; sequence: number; title: string; status: string; closesAt?: string }[];
  criteria?: { id: string; code: string; label: string; description?: string; weightBps: number; maxScore: number }[];
  sponsors?: { id: string; sponsorName: string; currency: string; pledgedMinor: number; settledMinor: number; settlementStatus: string }[];
  awards?: { id: string; entryId: string; title: string; status: string; amountMinor: number; currency: string }[];
};

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'prizes', label: 'Prizes' },
  { id: 'timeline', label: 'Timeline' },
] as const;

const howItWorks = [
  ['1. Apply & declare age band', 'Submit your entry or team roster. Youth entrants under 18 require verified guardian consent before public visibility.'],
  ['2. Independent eligibility review', 'Programme officers verify eligibility and safeguarding requirements before round scoring opens.'],
  ['3. Immutable SHA-256 submission', 'Upload proposal artefacts and optionally link a verified NeedMap intervention or Action Project.'],
  ['4. Conflict-cleared rubric judging', 'Assigned judges complete conflict-of-interest declarations and score criteria adding up to 10,000 basis points.'],
  ['5. Appeal window & verified awards', 'Decisions respect appeal holds; sponsor pledges, approved awards, and fulfilled prizes are tracked separately.'],
] as const;

export default function ChallengeDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const challengeId = String(params.id || 'chg-demo-1');
  const [detail, setDetail] = useState<ChallengeDetail | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Form states
  const [projectTitle, setProjectTitle] = useState('Clean Water Sensor Grid');
  const [teamName, setTeamName] = useState('Watershed Builders');
  const [ageBand, setAgeBand] = useState<'adult_18_plus' | 'youth_13_17'>('adult_18_plus');
  const [abstract, setAbstract] = useState('Community-verified solar turbidity sensors and biosand filtration.');
  const [entryId, setEntryId] = useState('entry-demo-1');
  const [memberSubjectId, setMemberSubjectId] = useState('citizen-2');
  const [guardianName, setGuardianName] = useState('Parent / Legal Guardian');
  const [roundId, setRoundId] = useState('round-demo-1');
  const [submissionSummary, setSubmissionSummary] = useState('Field prototype protocol and calibration dataset.');
  const [assignmentId, setAssignmentId] = useState('ja-demo-1');
  const [impactScore, setImpactScore] = useState('88');
  const [feasibilityScore, setFeasibilityScore] = useState('84');
  const [linkedProjectId, setLinkedProjectId] = useState('proj-demo-1');
  const [awardId, setAwardId] = useState('awd-demo-1');

  async function load() {
    setLoading(true);
    try {
      const loaded = await apiFetch<ChallengeDetail>(`/v1/challenges/${encodeURIComponent(challengeId)}`, {}, false);
      setDetail(loaded);
      if (loaded.rounds?.[0]?.id) setRoundId(loaded.rounds[0].id);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to load challenge detail.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [challengeId]);

  async function runAction(fn: () => Promise<void>) {
    setNotice('');
    try {
      await fn();
      await load();
    } catch (err) {
      if (err instanceof APIError && err.status === 401) {
        router.push('/signin');
        return;
      }
      setNotice(err instanceof Error ? err.message : 'Action failed.');
    }
  }

  const prog = detail?.program;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.screen}>
        <StitchTopBar />
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.topLinks}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/challenges')}>
              <Text style={s.linkText}>← All Challenges</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push('/impact')}>
              <Text style={s.linkText}>Impact Passport →</Text>
            </Pressable>
          </View>

          {!!notice && (
            <View style={s.notice}>
              <Text style={s.noticeText}>{notice}</Text>
            </View>
          )}

          {loading && (
            <View style={s.center}>
              <ActivityIndicator color={ImpactFlowPalette.brandPrimary} />
              <Text style={s.muted}>Loading challenge {challengeId}…</Text>
            </View>
          )}

          {prog && (
            <>
              <View style={s.hero}>
                <View style={s.badgeRow}>
                  <View style={s.badgeVerified}>
                    <Text style={s.badgeVerifiedText}>{prog.status.toUpperCase()}</Text>
                  </View>
                  <View style={s.badgeAmber}>
                    <Text style={s.badgeAmberText}>{prog.prizeSummary || 'Civic Recognition'}</Text>
                  </View>
                </View>
                <Text style={s.heroTitle}>{prog.title}</Text>
                <Text style={s.heroLead}>{prog.summary || ''}</Text>
                <Text style={s.heroMeta}>
                  Sponsor: {prog.sponsorName || 'Civic Coalition'} · Rules v{prog.rulesVersion || 1} ({prog.ruleApprovalsCount || 0}/2 approvals)
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
                {tabs.map((tab) => (
                  <Pressable
                    key={tab.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === tab.id }}
                    style={[s.tab, activeTab === tab.id && s.tabActive]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>{tab.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={s.card}>
                {activeTab === 'overview' && (
                  <>
                    <Text style={s.sectionTitle}>Programme Overview</Text>
                    <Text style={s.muted}>{prog.description || prog.summary || 'Open community innovation challenge.'}</Text>
                    <Text style={s.muted}>
                      Youth safeguarding: {prog.youthSafeguardingRequired ? 'Mandatory verified guardian consent for under-18 entrants' : 'Standard'}
                    </Text>
                  </>
                )}
                {activeTab === 'requirements' && (
                  <>
                    <Text style={s.sectionTitle}>Rubric & Eligibility Requirements</Text>
                    <Text style={s.muted}>Rubric weights total 10,000 basis points (100.00%). Dual human rule approval is required before publication.</Text>
                    {(detail?.criteria || []).map((cr) => (
                      <View key={cr.id} style={s.rowItem}>
                        <Text style={s.rowTitle}>{cr.label}</Text>
                        <Text style={s.muted}>{cr.weightBps} bps (max {cr.maxScore})</Text>
                      </View>
                    ))}
                  </>
                )}
                {activeTab === 'prizes' && (
                  <>
                    <Text style={s.sectionTitle}>Prizes & Sponsor Settlement Truth</Text>
                    <Text style={s.muted}>
                      Sponsor commitments distinguish pledged funds from settled PayCore receipts; approved awards are distinguished from fulfilled prizes.
                    </Text>
                    {(detail?.sponsors || []).map((sp) => (
                      <View key={sp.id} style={s.rowItem}>
                        <Text style={s.rowTitle}>{sp.sponsorName}</Text>
                        <Text style={s.muted}>Status: {sp.settlementStatus}</Text>
                      </View>
                    ))}
                  </>
                )}
                {activeTab === 'timeline' && (
                  <>
                    <Text style={s.sectionTitle}>Rounds & Deadlines</Text>
                    {(detail?.rounds || []).map((r) => (
                      <View key={r.id} style={s.rowItem}>
                        <Text style={s.rowTitle}>Round {r.sequence}: {r.title}</Text>
                        <Text style={s.muted}>{r.status} · {r.closesAt || 'Open'}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>

              <View style={s.card}>
                <Text style={s.sectionTitle}>How it works</Text>
                {howItWorks.map(([title, body], index) => (
                  <View key={title} style={s.stepRow}>
                    <View style={s.stepCircle}>
                      <Text style={s.stepNum}>{index + 1}</Text>
                    </View>
                    <View style={s.flex}>
                      <Text style={s.rowTitle}>{title}</Text>
                      <Text style={s.muted}>{body}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={s.card}>
                <Text style={s.sectionTitle}>1. Apply to Challenge & Youth Safeguarding</Text>
                <Text style={s.label}>Proposal title</Text>
                <TextInput style={s.input} value={projectTitle} onChangeText={setProjectTitle} accessibilityLabel="Proposal title" />
                <Text style={s.label}>Team name</Text>
                <TextInput style={s.input} value={teamName} onChangeText={setTeamName} accessibilityLabel="Team name" />
                <Text style={s.label}>Abstract</Text>
                <TextInput style={s.input} value={abstract} onChangeText={setAbstract} accessibilityLabel="Proposal abstract" />
                <View style={s.actionRow}>
                  <Pressable
                    style={[s.chip, ageBand === 'adult_18_plus' && s.chipActive]}
                    accessibilityRole="button"
                    onPress={() => setAgeBand('adult_18_plus')}
                  >
                    <Text style={[s.chipText, ageBand === 'adult_18_plus' && s.chipTextActive]}>Adult (18+)</Text>
                  </Pressable>
                  <Pressable
                    style={[s.chip, ageBand === 'youth_13_17' && s.chipActive]}
                    accessibilityRole="button"
                    onPress={() => setAgeBand('youth_13_17')}
                  >
                    <Text style={[s.chipText, ageBand === 'youth_13_17' && s.chipTextActive]}>Youth (13–17)</Text>
                  </Pressable>
                </View>
                <Pressable
                  style={s.primaryBtn}
                  accessibilityRole="button"
                  onPress={() =>
                    void runAction(async () => {
                      const created = await apiFetch<{ id: string }>(`/v1/challenges/${encodeURIComponent(challengeId)}/entries`, {
                        method: 'POST',
                        body: JSON.stringify({ projectTitle, teamName, abstract, entrantAgeBand: ageBand }),
                      });
                      if (created?.id) setEntryId(created.id);
                      setNotice(`Entry ${created?.id || ''} submitted.`);
                    })
                  }
                >
                  <Text style={s.primaryBtnText}>Apply to challenge →</Text>
                </Pressable>

                <Text style={s.label}>Entry ID</Text>
                <TextInput style={s.input} value={entryId} onChangeText={setEntryId} accessibilityLabel="Entry ID" />
                <Text style={s.label}>Team Member Subject ID</Text>
                <TextInput style={s.input} value={memberSubjectId} onChangeText={setMemberSubjectId} accessibilityLabel="Team member subject ID" />
                <Pressable
                  style={s.outlineBtn}
                  accessibilityRole="button"
                  onPress={() =>
                    void runAction(async () => {
                      await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/entries/${encodeURIComponent(entryId)}/team-members`, {
                        method: 'POST',
                        body: JSON.stringify({ memberSubjectId, role: 'member', ageBand: 'adult_18_plus' }),
                      });
                      setNotice('Team member invited.');
                    })
                  }
                >
                  <Text style={s.outlineBtnText}>Invite team member</Text>
                </Pressable>

                <Text style={s.label}>Guardian Name (for under-18 safeguarding)</Text>
                <TextInput style={s.input} value={guardianName} onChangeText={setGuardianName} accessibilityLabel="Guardian name" />
                <Pressable
                  style={s.outlineBtn}
                  accessibilityRole="button"
                  onPress={() =>
                    void runAction(async () => {
                      await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/entries/${encodeURIComponent(entryId)}/guardian-consents`, {
                        method: 'POST',
                        body: JSON.stringify({
                          minorSubjectId: 'minor-1',
                          guardianName,
                          guardianContactRef: 'guardian@example.org',
                          status: 'verified',
                          evidenceDigestSha256: 'a'.repeat(64),
                        }),
                      });
                      setNotice('Verified guardian consent recorded.');
                    })
                  }
                >
                  <Text style={s.outlineBtnText}>Record verified guardian consent</Text>
                </Pressable>
              </View>

              <View style={s.card}>
                <Text style={s.sectionTitle}>2. Round Submission & Action Project Link</Text>
                <Text style={s.label}>Submission summary</Text>
                <TextInput style={s.input} value={submissionSummary} onChangeText={setSubmissionSummary} accessibilityLabel="Submission summary" />
                <Pressable
                  style={s.primaryBtn}
                  accessibilityRole="button"
                  onPress={() =>
                    void runAction(async () => {
                      await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/entries/${encodeURIComponent(entryId)}/submissions`, {
                        method: 'POST',
                        body: JSON.stringify({
                          roundId,
                          summary: submissionSummary,
                          artifactDigestSha256: 'b'.repeat(64),
                        }),
                      });
                      setNotice('Round submission recorded with SHA-256 receipt.');
                    })
                  }
                >
                  <Text style={s.primaryBtnText}>Submit round proposal</Text>
                </Pressable>

                <Text style={s.label}>Action Project ID</Text>
                <TextInput style={s.input} value={linkedProjectId} onChangeText={setLinkedProjectId} accessibilityLabel="Action Project ID" />
                <Pressable
                  style={s.outlineBtn}
                  accessibilityRole="button"
                  onPress={() =>
                    void runAction(async () => {
                      await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/entries/${encodeURIComponent(entryId)}/project-link`, {
                        method: 'POST',
                        body: JSON.stringify({ projectId: linkedProjectId }),
                      });
                      setNotice('Linked entry to Action Project.');
                    })
                  }
                >
                  <Text style={s.outlineBtnText}>Link Action Project</Text>
                </Pressable>
              </View>

              <View style={s.card}>
                <Text style={s.sectionTitle}>3. Judge COI & Rubric Scorecard</Text>
                <Text style={s.label}>Judge Assignment ID</Text>
                <TextInput style={s.input} value={assignmentId} onChangeText={setAssignmentId} accessibilityLabel="Judge assignment ID" />
                <Pressable
                  style={s.outlineBtn}
                  accessibilityRole="button"
                  onPress={() =>
                    void runAction(async () => {
                      await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/judge-assignments/${encodeURIComponent(assignmentId)}/conflict`, {
                        method: 'POST',
                        body: JSON.stringify({ coiStatus: 'cleared', note: 'No financial or organizational conflict.' }),
                      });
                      setNotice('Judge COI clearance recorded.');
                    })
                  }
                >
                  <Text style={s.outlineBtnText}>Clear conflict of interest</Text>
                </Pressable>
                <View style={s.actionRow}>
                  <View style={s.flex}>
                    <Text style={s.label}>Impact (0–100)</Text>
                    <TextInput style={s.input} value={impactScore} onChangeText={setImpactScore} keyboardType="numeric" accessibilityLabel="Impact score" />
                  </View>
                  <View style={s.flex}>
                    <Text style={s.label}>Feasibility (0–100)</Text>
                    <TextInput style={s.input} value={feasibilityScore} onChangeText={setFeasibilityScore} keyboardType="numeric" accessibilityLabel="Feasibility score" />
                  </View>
                </View>
                <Pressable
                  style={s.primaryBtn}
                  accessibilityRole="button"
                  onPress={() =>
                    void runAction(async () => {
                      const c0 = detail?.criteria?.[0]?.id || 'crit-1';
                      const c1 = detail?.criteria?.[1]?.id || c0;
                      await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/judge-assignments/${encodeURIComponent(assignmentId)}/scorecards`, {
                        method: 'POST',
                        body: JSON.stringify({
                          overallComment: 'Verified community co-design and milestone plan.',
                          criteriaScores: [
                            { criterionId: c0, rawScore: Number(impactScore), rationale: 'High community impact' },
                            { criterionId: c1, rawScore: Number(feasibilityScore), rationale: 'Clear field plan' },
                          ],
                        }),
                      });
                      setNotice('Server-computed basis-point scorecard recorded.');
                    })
                  }
                >
                  <Text style={s.primaryBtnText}>Submit judge scorecard</Text>
                </Pressable>
              </View>

              <View style={s.card}>
                <Text style={s.sectionTitle}>4. Governance, Sponsors, Awards & Appeals</Text>
                <Text style={s.muted}>Server-authorized programme governance actions:</Text>
                <View style={s.govGrid}>
                  <Pressable
                    style={s.outlineBtn}
                    accessibilityRole="button"
                    onPress={() =>
                      void runAction(async () => {
                        await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/rule-approvals`, {
                          method: 'POST',
                          body: JSON.stringify({ note: 'Approved rules v1' }),
                        });
                        setNotice('Rule approval recorded.');
                      })
                    }
                  >
                    <Text style={s.outlineBtnText}>Approve rules</Text>
                  </Pressable>

                  <Pressable
                    style={s.outlineBtn}
                    accessibilityRole="button"
                    onPress={() =>
                      void runAction(async () => {
                        await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/publish`, {
                          method: 'POST',
                          body: JSON.stringify({}),
                        });
                        setNotice('Challenge published.');
                      })
                    }
                  >
                    <Text style={s.outlineBtnText}>Publish challenge</Text>
                  </Pressable>

                  <Pressable
                    style={s.outlineBtn}
                    accessibilityRole="button"
                    onPress={() =>
                      void runAction(async () => {
                        await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/entries/${encodeURIComponent(entryId)}/eligibility-decisions`, {
                          method: 'POST',
                          body: JSON.stringify({ status: 'eligible', reason: 'Verified civic eligibility' }),
                        });
                        setNotice('Entry marked eligible.');
                      })
                    }
                  >
                    <Text style={s.outlineBtnText}>Mark entry eligible</Text>
                  </Pressable>

                  <Pressable
                    style={s.outlineBtn}
                    accessibilityRole="button"
                    onPress={() =>
                      void runAction(async () => {
                        await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/judge-assignments`, {
                          method: 'POST',
                          body: JSON.stringify({ roundId, entryId, judgeSubjectId: 'verifier-1' }),
                        });
                        setNotice('Judge assigned.');
                      })
                    }
                  >
                    <Text style={s.outlineBtnText}>Assign judge</Text>
                  </Pressable>

                  <Pressable
                    style={s.outlineBtn}
                    accessibilityRole="button"
                    onPress={() =>
                      void runAction(async () => {
                        await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/rounds/${encodeURIComponent(roundId)}/decisions`, {
                          method: 'POST',
                          body: JSON.stringify({ entryId, decision: 'winner', status: 'published', rationale: 'Selected by panel' }),
                        });
                        setNotice('Round decision published.');
                      })
                    }
                  >
                    <Text style={s.outlineBtnText}>Publish decision</Text>
                  </Pressable>

                  <Pressable
                    style={s.outlineBtn}
                    accessibilityRole="button"
                    onPress={() =>
                      void runAction(async () => {
                        await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/appeals`, {
                          method: 'POST',
                          body: JSON.stringify({ entryId, reason: 'Procedural review request' }),
                        });
                        setNotice('Appeal recorded.');
                      })
                    }
                  >
                    <Text style={s.outlineBtnText}>File appeal</Text>
                  </Pressable>

                  <Pressable
                    style={s.outlineBtn}
                    accessibilityRole="button"
                    onPress={() =>
                      void runAction(async () => {
                        await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/sponsors`, {
                          method: 'POST',
                          body: JSON.stringify({
                            sponsorName: 'Civic Resilience Fund',
                            contributionType: 'cash_prize',
                            currency: 'CAD',
                            pledgedMinor: 2500000,
                            settledMinor: 0,
                            settlementStatus: 'pledged',
                          }),
                        });
                        setNotice('Sponsor pledge recorded.');
                      })
                    }
                  >
                    <Text style={s.outlineBtnText}>Record sponsor pledge</Text>
                  </Pressable>

                  <Pressable
                    style={s.outlineBtn}
                    accessibilityRole="button"
                    onPress={() =>
                      void runAction(async () => {
                        const aw = await apiFetch<{ id: string }>(`/v1/challenges/${encodeURIComponent(challengeId)}/awards`, {
                          method: 'POST',
                          body: JSON.stringify({
                            entryId,
                            title: 'First Place Civic Award',
                            awardType: 'cash_grant',
                            currency: 'CAD',
                            amountMinor: 1500000,
                          }),
                        });
                        if (aw?.id) setAwardId(aw.id);
                        setNotice('Award approved.');
                      })
                    }
                  >
                    <Text style={s.outlineBtnText}>Approve award</Text>
                  </Pressable>

                  <Pressable
                    style={s.outlineBtn}
                    accessibilityRole="button"
                    onPress={() =>
                      void runAction(async () => {
                        await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/awards/${encodeURIComponent(awardId)}/fulfillments`, {
                          method: 'POST',
                          body: JSON.stringify({
                            status: 'fulfilled',
                            providerReceiptRef: 'paycore-rcpt-001',
                            note: 'Confirmed external settlement receipt',
                          }),
                        });
                        setNotice('Prize fulfillment recorded.');
                      })
                    }
                  >
                    <Text style={s.outlineBtnText}>Fulfill award</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
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
  center: { padding: 24, alignItems: 'center', gap: 8 },
  topLinks: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkText: { color: ImpactFlowPalette.brandPrimary, fontWeight: '800', fontSize: 14 },
  notice: { backgroundColor: ImpactFlowPalette.statusInfoBg, borderRadius: 14, padding: 12 },
  noticeText: { color: ImpactFlowPalette.statusInfoText, fontWeight: '700', fontSize: 13 },
  hero: { backgroundColor: ImpactFlowPalette.brandForest, borderRadius: 22, padding: 22, gap: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badgeVerified: { backgroundColor: ImpactFlowPalette.statusVerifiedBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeVerifiedText: { color: ImpactFlowPalette.statusVerifiedText, fontSize: 11, fontWeight: '800' },
  badgeAmber: { backgroundColor: ImpactFlowPalette.accentAmber, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeAmberText: { color: ImpactFlowPalette.accentAmberInk, fontSize: 11, fontWeight: '800' },
  heroTitle: { color: '#FFFFFF', fontSize: 23, lineHeight: 29, fontWeight: '800' },
  heroLead: { color: '#DCEAE3', fontSize: 14, lineHeight: 20 },
  heroMeta: { color: '#B8D4C8', fontSize: 12, marginTop: 2 },
  tabRow: { gap: 8 },
  tab: { minHeight: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: ImpactFlowPalette.borderDefault, justifyContent: 'center' },
  tabActive: { backgroundColor: ImpactFlowPalette.brandPrimary, borderColor: ImpactFlowPalette.brandPrimary },
  tabText: { color: ImpactFlowPalette.inkPrimary, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#FFFFFF' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: ImpactFlowPalette.borderDefault, gap: 10 },
  sectionTitle: { color: ImpactFlowPalette.inkPrimary, fontSize: 17, fontWeight: '800' },
  muted: { color: ImpactFlowPalette.inkSecondary, fontSize: 13, lineHeight: 19 },
  rowItem: { borderTopWidth: 1, borderTopColor: ImpactFlowPalette.borderDefault, paddingTop: 10, gap: 2 },
  rowTitle: { color: ImpactFlowPalette.inkPrimary, fontSize: 14, fontWeight: '700' },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingTop: 8 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: ImpactFlowPalette.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: ImpactFlowPalette.brandPrimary, fontWeight: '800', fontSize: 13 },
  label: { color: ImpactFlowPalette.inkPrimary, fontSize: 13, fontWeight: '700' },
  input: { minHeight: 46, borderWidth: 1, borderColor: ImpactFlowPalette.borderStrong, borderRadius: 12, paddingHorizontal: 12, color: ImpactFlowPalette.inkPrimary, backgroundColor: '#FFFFFF' },
  actionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: ImpactFlowPalette.borderDefault, justifyContent: 'center' },
  chipActive: { backgroundColor: ImpactFlowPalette.brandPrimary, borderColor: ImpactFlowPalette.brandPrimary },
  chipText: { color: ImpactFlowPalette.inkPrimary, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#FFFFFF' },
  primaryBtn: { minHeight: 48, borderRadius: 12, backgroundColor: ImpactFlowPalette.brandPrimary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  outlineBtn: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: ImpactFlowPalette.borderStrong, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { color: ImpactFlowPalette.inkPrimary, fontWeight: '700', fontSize: 13 },
  govGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
});
