import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiFetch, getSession, postJSON, type Session } from '../lib/api';
import { capabilitiesForRoles, verificationTransitionsForRoles } from '../lib/capabilities';
import { Stitch } from '../lib/stitch-theme';

type Need = { id: string; title: string; description: string; verificationState: string; category?: string; sdgTags?: number[] };
type CreatedProject = { id: string; title: string };
type EvidenceDecision = 'available' | 'quarantined' | 'rejected';

export default function VerificationWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [needId, setNeedId] = useState('');
  const [need, setNeed] = useState<Need | null>(null);
  const [evidenceId, setEvidenceId] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [busy, setBusy] = useState('session');
  const [error, setError] = useState('');

  useEffect(() => { getSession().then(setSession).catch(() => router.replace('/signin')).finally(() => setBusy('')); }, []);
  const caps = useMemo(() => capabilitiesForRoles(session?.roles ?? []), [session?.roles]);
  const transitions = useMemo(() => verificationTransitionsForRoles(session?.roles ?? [], need?.verificationState), [session?.roles, need?.verificationState]);

  async function loadNeed() {
    if (!needId.trim()) return;
    setBusy('need'); setError('');
    try { const value = await apiFetch<Need>(`/v1/needs/${encodeURIComponent(needId.trim())}`, {}, false); setNeed(value); setProjectTitle(value.title); }
    catch (err) { setNeed(null); setError(err instanceof Error ? err.message : 'Unable to load need.'); }
    finally { setBusy(''); }
  }

  async function transition(state: string, label: string) {
    if (!need) return;
    setBusy(state); setError('');
    try { const value = await postJSON<Need>(`/v1/needs/${encodeURIComponent(need.id)}/verification`, { state }); setNeed(value); Alert.alert('Verification updated', `${label} was recorded by the server.`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Verification could not be updated.'); }
    finally { setBusy(''); }
  }

  async function reviewEvidence(decision: EvidenceDecision) {
    if (!evidenceId.trim()) { Alert.alert('Evidence ID required', 'Enter the evidence record you are reviewing.'); return; }
    setBusy(`evidence-${decision}`); setError('');
    try { await postJSON(`/v1/evidence/${encodeURIComponent(evidenceId.trim())}/review`, { decision }); Alert.alert('Evidence review recorded', `State: ${human(decision)}.`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Evidence review could not be recorded.'); }
    finally { setBusy(''); }
  }

  async function openApprovedEvidence() {
    if (!need?.id || !evidenceId.trim()) { Alert.alert('Need and evidence required', 'Load the need and enter the evidence ID first.'); return; }
    setBusy('evidence-access'); setError('');
    try {
      const access = await apiFetch<{ url: string }>(`/v1/needs/${encodeURIComponent(need.id)}/evidence/${encodeURIComponent(evidenceId.trim())}/access`);
      if (!access.url) throw new Error('The evidence service did not return a signed access URL.');
      const supported = await Linking.canOpenURL(access.url);
      if (!supported) throw new Error('This device cannot open the approved evidence URL.');
      await Linking.openURL(access.url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Approved evidence could not be opened.'); }
    finally { setBusy(''); }
  }

  async function convertToProject() {
    if (!need) return;
    if (!projectTitle.trim() || !communityId.trim()) { Alert.alert('Project details required', 'Add a title and owner community ID.'); return; }
    setBusy('project'); setError('');
    try { const project = await postJSON<CreatedProject>(`/v1/needs/${encodeURIComponent(need.id)}/project`, { title: projectTitle.trim(), description: need.description, ownerCommunityId: communityId.trim() }); Alert.alert('Action Project created', project.title, [{ text: 'Open project', onPress: () => router.push(`/project/${project.id}`) }]); }
    catch (err) { setError(err instanceof Error ? err.message : 'Project could not be created.'); }
    finally { setBusy(''); }
  }

  if (busy === 'session') return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={Stitch.color.primary}/><Text style={s.muted}>Loading verification authority…</Text></View></SafeAreaView>;

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <View style={s.top}><Pressable onPress={() => router.back()}><Text style={s.link}>← Workspace</Text></Pressable><Text style={s.role}>{session?.roles.length ? session.roles.map(human).join(' · ') : 'Community member'}</Text></View>
    <Text style={s.kicker}>VERIFICATION WORKSPACE</Text><Text style={s.title}>Make evidence-backed state changes, not social-media votes.</Text><Text style={s.muted}>Only transitions authorized by your signed identity roles are shown. The API independently verifies the same authority.</Text>
    {!!error && <View style={s.errorCard}><Text style={s.error}>{error}</Text></View>}
    <View style={s.card}><Text style={s.section}>Load a reported need</Text><TextInput value={needId} onChangeText={setNeedId} style={s.input} autoCapitalize="none" placeholder="Need ID" /><Pressable style={s.secondary} onPress={() => void loadNeed()}><Text style={s.secondaryText}>{busy === 'need' ? 'Loading…' : 'Load need'}</Text></Pressable></View>
    {need && <View style={s.card}><View style={s.row}><Text style={s.badge}>{human(need.verificationState)}</Text><Text style={s.meta}>{need.id}</Text></View><Text style={s.needTitle}>{need.title}</Text><Text style={s.muted}>{need.description}</Text><Text style={s.section}>Permitted state changes</Text><View style={s.actions}>{transitions.map((item) => <Pressable key={item.state} disabled={!!busy} style={[s.action, item.state === 'rejected' && s.danger]} onPress={() => void transition(item.state, item.label)}><Text style={[s.actionText, item.state === 'rejected' && s.dangerText]}>{busy === item.state ? 'Saving…' : item.label}</Text></Pressable>)}</View></View>}
    {caps.has('project.convert') && need && <View style={s.card}><Text style={s.section}>Convert verified need to Action Project</Text><Text style={s.muted}>Conversion remains blocked by the API until the need has reached an accepted verified state.</Text><TextInput value={projectTitle} onChangeText={setProjectTitle} style={s.input} placeholder="Project title" /><TextInput value={communityId} onChangeText={setCommunityId} style={s.input} placeholder="Owner community ID" /><Pressable style={s.primary} disabled={!!busy} onPress={() => void convertToProject()}><Text style={s.primaryText}>{busy === 'project' ? 'Creating…' : 'Create Action Project'}</Text></Pressable></View>}
    {caps.has('evidence.review') && <View style={s.card}><Text style={s.section}>Evidence review & approved access</Text><Text style={s.muted}>Evidence bytes remain protected until the review/access policy grants a short-lived signed URL.</Text><TextInput value={evidenceId} onChangeText={setEvidenceId} style={s.input} autoCapitalize="none" placeholder="Evidence ID" /><View style={s.actions}><Pressable style={s.action} onPress={() => void reviewEvidence('available')}><Text style={s.actionText}>Approve / available</Text></Pressable><Pressable style={s.action} onPress={() => void reviewEvidence('quarantined')}><Text style={s.actionText}>Quarantine</Text></Pressable><Pressable style={[s.action, s.danger]} onPress={() => void reviewEvidence('rejected')}><Text style={s.dangerText}>Reject</Text></Pressable></View><Pressable style={s.secondary} disabled={busy==='evidence-access'} onPress={() => void openApprovedEvidence()}><Text style={s.secondaryText}>{busy==='evidence-access'?'Requesting signed URL…':'Open approved evidence'}</Text></Pressable></View>}
    <View style={s.truth}><Text style={s.truthTitle}>Authority is scoped</Text><Text style={s.truthBody}>Community, institution, expert, audit and government confirmations are different authorities. Evidence review and evidence-byte access are also separate server decisions.</Text></View>
  </ScrollView></SafeAreaView>;
}
function human(v: string) { return v.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
const s = StyleSheet.create({safe:{flex:1,backgroundColor:Stitch.color.background},content:{padding:20,gap:14,paddingBottom:50},center:{flex:1,alignItems:'center',justifyContent:'center',gap:10,padding:24},top:{flexDirection:'row',justifyContent:'space-between',gap:12,alignItems:'center'},link:{color:Stitch.color.primary,fontWeight:'900'},role:{color:Stitch.color.onSurfaceVariant,fontSize:11,flex:1,textAlign:'right'},kicker:{...Stitch.type.eyebrow,color:Stitch.color.secondary},title:{...Stitch.type.hero,color:Stitch.color.primary},muted:{...Stitch.type.body,color:Stitch.color.onSurfaceVariant},card:{backgroundColor:Stitch.color.surfaceLowest,borderWidth:1,borderColor:Stitch.color.outlineVariant,borderRadius:18,padding:16,gap:10},section:{...Stitch.type.section,color:Stitch.color.primary},input:{borderWidth:1,borderColor:Stitch.color.outlineVariant,borderRadius:12,padding:12,backgroundColor:Stitch.color.surfaceLowest,color:Stitch.color.onSurface},primary:{backgroundColor:Stitch.color.primaryContainer,padding:14,borderRadius:13},primaryText:{color:Stitch.color.onPrimary,fontWeight:'900',textAlign:'center'},secondary:{borderWidth:1,borderColor:Stitch.color.outline,padding:13,borderRadius:13},secondaryText:{color:Stitch.color.primary,fontWeight:'900',textAlign:'center'},row:{flexDirection:'row',justifyContent:'space-between',gap:10},badge:{backgroundColor:Stitch.color.secondaryFixed,color:Stitch.color.secondary,fontWeight:'900',paddingHorizontal:9,paddingVertical:5,borderRadius:999,overflow:'hidden'},meta:{color:Stitch.color.onSurfaceVariant,fontSize:11},needTitle:{color:Stitch.color.primary,fontSize:20,fontWeight:'900'},actions:{flexDirection:'row',flexWrap:'wrap',gap:8},action:{borderWidth:1,borderColor:Stitch.color.outline,borderRadius:999,paddingHorizontal:11,paddingVertical:9},actionText:{color:Stitch.color.primary,fontWeight:'800'},danger:{borderColor:'#D5A39A',backgroundColor:Stitch.color.errorContainer},dangerText:{color:Stitch.color.error,fontWeight:'900'},errorCard:{backgroundColor:Stitch.color.errorContainer,borderRadius:14,padding:13},error:{color:Stitch.color.onErrorContainer,fontWeight:'700'},truth:{backgroundColor:'#F0FAF5',borderWidth:1,borderColor:Stitch.color.secondaryFixedDim,borderRadius:16,padding:15,gap:4},truthTitle:{color:Stitch.color.secondary,fontWeight:'900'},truthBody:{color:Stitch.color.onSurfaceVariant,lineHeight:20}});
