import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAccessToken } from '../../lib/session';

type Need = {
  id: string;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  reporterId: string;
  verificationState: string;
  sdgTags: number[];
  createdAt: string;
  updatedAt: string;
};

export default function NeedDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [need, setNeed] = useState<Need | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  async function loadNeed() {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
    if (!baseUrl || !id) { setError('The need API is not configured on this build.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const response = await fetch(`${baseUrl}/v1/needs/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error(`request failed: ${response.status}`);
      setNeed((await response.json()) as Need);
    } catch {
      setError('This community need could not be loaded. Check connectivity and try again.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadNeed(); }, [id]);

  async function requestVerification() {
    if (!need || need.verificationState !== 'observed') return;
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
    if (!baseUrl) return;
    const token = await getAccessToken();
    if (!token) {
      router.push('/signin');
      return;
    }
    setRequesting(true);
    try {
      const response = await fetch(`${baseUrl}/v1/needs/${encodeURIComponent(need.id)}/verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ state: 'verification_requested' })
      });
      if (response.status === 401) {
        router.push('/signin');
        return;
      }
      if (response.status === 403) {
        Alert.alert('Action not permitted', 'Your identity is valid, but your current role is not allowed to perform this verification action.');
        return;
      }
      if (!response.ok) throw new Error(`verification request failed: ${response.status}`);
      const updated = (await response.json()) as Need;
      setNeed(updated);
      Alert.alert('Verification requested', 'This remains an observation until an eligible community, institution, expert, auditor, or government verifier confirms it.');
    } catch {
      Alert.alert('Request not sent', 'Verification could not be requested. Check connectivity and try again.');
    } finally { setRequesting(false); }
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>← Back to NeedMap</Text></Pressable>
    {loading && <View style={styles.loading}><ActivityIndicator/><Text style={styles.muted}>Loading community need…</Text></View>}
    {!!error && <View style={styles.notice}><Text style={styles.noticeTitle}>Unable to load</Text><Text style={styles.noticeText}>{error}</Text><Pressable onPress={loadNeed}><Text style={styles.link}>Try again</Text></Pressable></View>}
    {need && <>
      <Text style={styles.eyebrow}>COMMUNITY NEED</Text>
      <Text style={styles.title}>{need.title}</Text>
      <View style={styles.row}><Text style={styles.category}>{need.category || 'Community'}</Text><Text style={isConfirmed(need.verificationState)?styles.verified:styles.pending}>{label(need.verificationState)}</Text></View>
      <Text style={styles.description}>{need.description}</Text>
      <View style={styles.panel}><Text style={styles.panelTitle}>Where</Text><Text style={styles.meta}>{need.latitude.toFixed(5)}, {need.longitude.toFixed(5)}</Text><Text style={styles.panelTitle}>SDG alignment</Text><Text style={styles.meta}>{need.sdgTags.length ? need.sdgTags.map((n)=>`SDG ${n}`).join(' · ') : 'Not classified yet'}</Text></View>
      <View style={styles.truth}><Text style={styles.truthTitle}>Observation ≠ verification</Text><Text style={styles.truthText}>A report places attention on a possible need. Confirmation must come through the platform’s verification process; reporting it does not make the claim verified.</Text></View>
      {need.verificationState === 'observed' && <Pressable style={[styles.primary, requesting && styles.disabled]} disabled={requesting} onPress={requestVerification}><Text style={styles.primaryText}>{requesting ? 'Requesting…' : 'Request community verification'}</Text></Pressable>}
      {need.verificationState === 'verification_requested' && <View style={styles.waiting}><Text style={styles.waitingTitle}>Verification requested</Text><Text style={styles.waitingText}>The need is awaiting an eligible verifier. Requesting verification does not allow the reporter to confirm their own claim.</Text></View>}
      <Text style={styles.footnote}>Evidence media is not displayed yet because the object-storage/evidence API has not been implemented. The app does not fabricate or imply uploaded evidence.</Text>
    </>}
  </ScrollView></SafeAreaView>;
}

function isConfirmed(state:string){return ['community_confirmed','institution_confirmed','expert_confirmed','independently_audited','government_confirmed'].includes(state)}
function label(state:string){if(isConfirmed(state))return 'Verified';if(state==='verification_requested')return 'Verification requested';if(state==='disputed')return 'Disputed';if(state==='rejected')return 'Rejected';return 'Observed'}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:20,gap:14,paddingBottom:40},back:{color:'#2D6E9F',fontWeight:'800'},loading:{paddingVertical:30,alignItems:'center',gap:10},muted:{color:'#667788'},eyebrow:{color:'#2D7A56',fontWeight:'900',letterSpacing:1.5},title:{color:'#17324D',fontSize:28,lineHeight:34,fontWeight:'900'},row:{flexDirection:'row',justifyContent:'space-between',gap:12},category:{color:'#2D6E9F',fontWeight:'800'},verified:{color:'#24724D',fontWeight:'900'},pending:{color:'#9A6423',fontWeight:'900'},description:{color:'#334B5D',fontSize:16,lineHeight:24},panel:{backgroundColor:'white',borderRadius:18,padding:16,gap:7},panelTitle:{fontWeight:'900',color:'#17324D',marginTop:4},meta:{color:'#667788'},truth:{backgroundColor:'#FFF7E7',padding:15,borderRadius:15,gap:4},truthTitle:{color:'#6D4A14',fontWeight:'900'},truthText:{color:'#7D6848',lineHeight:20},primary:{backgroundColor:'#153B5B',padding:16,borderRadius:14},primaryText:{color:'white',fontWeight:'900',textAlign:'center'},disabled:{opacity:.55},waiting:{backgroundColor:'#E9F5EF',padding:15,borderRadius:15,gap:4},waitingTitle:{color:'#245840',fontWeight:'900'},waitingText:{color:'#416A56',lineHeight:20},notice:{backgroundColor:'#FFF0EF',padding:15,borderRadius:15,gap:5},noticeTitle:{color:'#8A352F',fontWeight:'900'},noticeText:{color:'#76504D'},link:{color:'#2D6E9F',fontWeight:'800'},footnote:{color:'#748391',fontSize:12,lineHeight:18}});
