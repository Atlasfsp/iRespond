import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Need = {
  id: string;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  verificationState: string;
  sdgTags: number[];
};

export default function NeedMap() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [status, setStatus] = useState('Finding your location…');
  const [loading, setLoading] = useState(true);

  async function loadNearby() {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus('Location permission is needed for nearby discovery. You can still report needs without granting it.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
      if (!baseUrl) {
        setStatus('NeedMap API is not configured on this build.');
        return;
      }
      const url = `${baseUrl}/v1/needs?lat=${position.coords.latitude}&lng=${position.coords.longitude}&radiusKm=25`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`NeedMap request failed: ${response.status}`);
      const data = (await response.json()) as Need[];
      setNeeds(data);
      setStatus(data.length === 0 ? 'No reported needs were found within 25 km.' : `${data.length} reported need${data.length === 1 ? '' : 's'} within 25 km.`);
    } catch {
      setStatus('Nearby needs could not be loaded. Check connectivity and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadNearby(); }, []);

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>← Back</Text></Pressable>
    <Text style={styles.eyebrow}>NEEDMAP</Text>
    <Text style={styles.title}>See what needs attention around you.</Text>
    <View style={styles.map}><Text style={styles.mapTitle}>Nearby community intelligence</Text><Text style={styles.mapText}>This surface queries the live geospatial API. Interactive map tiles and clustered pins are a later visual layer; the underlying nearby data is live.</Text></View>
    <View style={styles.statusRow}>{loading && <ActivityIndicator />}<Text style={styles.status}>{status}</Text></View>
    {!loading && <Pressable style={styles.retry} onPress={loadNearby}><Text style={styles.retryText}>Refresh nearby needs</Text></Pressable>}
    {needs.map((need)=><Pressable key={need.id} style={styles.card} onPress={() => router.push(`/need/${need.id}`)} accessibilityRole="button"><View style={styles.row}><Text style={styles.sdg}>{need.sdgTags.length ? need.sdgTags.map((n)=>`SDG ${n}`).join(' · ') : need.category || 'Community'}</Text><Text style={isConfirmed(need.verificationState)?styles.verified:styles.pending}>{verificationLabel(need.verificationState)}</Text></View><Text style={styles.cardTitle}>{need.title}</Text><Text style={styles.meta}>{need.latitude.toFixed(4)}, {need.longitude.toFixed(4)}</Text><Text style={styles.action}>View need →</Text></Pressable>)}
  </ScrollView></SafeAreaView>;
}

function isConfirmed(state: string) { return ['community_confirmed','institution_confirmed','expert_confirmed','independently_audited','government_confirmed'].includes(state); }
function verificationLabel(state: string) { return isConfirmed(state) ? 'Verified' : state === 'verification_requested' ? 'Verification requested' : state === 'disputed' ? 'Disputed' : state === 'rejected' ? 'Rejected' : 'Observed'; }

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:20,gap:14,paddingBottom:40},back:{color:'#2D6E9F',fontWeight:'800'},eyebrow:{color:'#2D7A56',fontWeight:'900',letterSpacing:1.5},title:{color:'#17324D',fontSize:28,lineHeight:34,fontWeight:'900'},map:{backgroundColor:'#DDEBF4',borderRadius:20,minHeight:190,padding:20,justifyContent:'center',gap:8},mapTitle:{color:'#17324D',fontSize:22,fontWeight:'900'},mapText:{color:'#526778',lineHeight:20},statusRow:{flexDirection:'row',alignItems:'center',gap:9},status:{color:'#5E6F7E',flex:1},retry:{borderWidth:1,borderColor:'#9CB8CD',padding:12,borderRadius:12},retryText:{color:'#2D6E9F',fontWeight:'800',textAlign:'center'},card:{backgroundColor:'white',borderRadius:18,padding:16,gap:8},row:{flexDirection:'row',justifyContent:'space-between',gap:8},sdg:{color:'#2D6E9F',fontWeight:'800',flex:1},verified:{color:'#24724D',fontWeight:'800'},pending:{color:'#9A6423',fontWeight:'800'},cardTitle:{color:'#142B3E',fontSize:18,lineHeight:24,fontWeight:'900'},meta:{color:'#667788'},action:{color:'#2D6E9F',fontWeight:'900',paddingTop:4}});
