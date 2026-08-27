import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { flushNeedQueue, pendingNeedCount } from '../lib/sync';

const featuredNeeds = [
  { id: 'water-001', tag: 'Water & sanitation', title: 'Community water point needs repair', place: 'Surulere, Lagos', verified: true, responders: 18 },
  { id: 'school-001', tag: 'Education', title: 'Restore books and lighting in a school library', place: 'Ikeja, Lagos', verified: false, responders: 7 },
  { id: 'care-001', tag: 'Community care', title: 'Weekly support rota for elderly neighbours', place: 'Yaba, Lagos', verified: true, responders: 11 }
];

export default function ImpactFeed() {
  const [pendingSync, setPendingSync] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  async function sync() {
    await flushNeedQueue();
    setPendingSync(await pendingNeedCount());
  }
  useEffect(() => { void sync(); }, []);
  async function refresh() { setRefreshing(true); try { await sync(); } finally { setRefreshing(false); } }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
    <View style={styles.brandRow}><View><Text style={styles.wordmark}>iRespond</Text><Text style={styles.brandLine}>Community action, evidenced.</Text></View><Pressable style={styles.workspaceButton} onPress={() => router.push('/workspace')} accessibilityRole="button"><Text style={styles.workspaceText}>My workspace</Text></Pressable></View>

    {pendingSync > 0 && <Pressable style={styles.syncBanner} onPress={() => void refresh()}><Text style={styles.syncTitle}>{pendingSync} observation{pendingSync === 1 ? '' : 's'} waiting to sync</Text><Text style={styles.syncText}>Tap to retry. Your reports remain safely queued on this device.</Text></Pressable>}

    <View style={styles.hero}><Text style={styles.eyebrow}>SEE IT · OWN IT · SOLVE IT</Text><Text style={styles.title}>What can you change where you are?</Text><Text style={styles.subtitle}>Turn a visible need into verified community action, then follow the outcome instead of stopping at the post.</Text><View style={styles.heroActions}><Pressable style={styles.primary} onPress={() => router.push('/report')} accessibilityRole="button"><Text style={styles.primaryText}>Report a community need</Text></Pressable><Pressable style={styles.heroSecondary} onPress={() => router.push('/needmap')} accessibilityRole="button"><Text style={styles.heroSecondaryText}>Explore NeedMap</Text></Pressable></View></View>

    <View style={styles.compass}><View style={{flex:1}}><Text style={styles.sectionTitle}>Your 3P Action Compass</Text><Text style={styles.muted}>Respond through your place, position and possessions/capabilities.</Text></View><View style={styles.compassRow}>{['Place', 'Position', 'Possessions'].map((item) => <View key={item} style={styles.compassItem}><Text style={styles.compassText}>{item}</Text></View>)}</View></View>

    <View style={styles.quickGrid}>
      <Pressable style={styles.quickCard} onPress={() => router.push('/impact')}><Text style={styles.quickTitle}>Impact Passport</Text><Text style={styles.quickText}>Verified contribution history</Text></Pressable>
      <Pressable style={styles.quickCard} onPress={() => router.push('/contributions')}><Text style={styles.quickTitle}>My offers</Text><Text style={styles.quickText}>Time, skills & resources</Text></Pressable>
      <Pressable style={styles.quickCard} onPress={() => router.push('/pledges')}><Text style={styles.quickTitle}>My pledges</Text><Text style={styles.quickText}>Funding commitments</Text></Pressable>
      <Pressable style={styles.quickCard} onPress={() => router.push('/notifications')}><Text style={styles.quickTitle}>Notifications</Text><Text style={styles.quickText}>Updates & preferences</Text></Pressable>
    </View>

    <View style={styles.headerRow}><View><Text style={styles.sectionTitle}>Needs near you</Text><Text style={styles.muted}>Featured examples; NeedMap queries the live API.</Text></View><Pressable onPress={() => router.push('/needmap')}><Text style={styles.link}>Open map →</Text></Pressable></View>
    {featuredNeeds.map((need) => <Pressable key={need.id} style={styles.card} onPress={() => router.push(`/need/${need.id}`)} accessibilityRole="button"><View style={styles.cardTop}><Text style={styles.tag}>{need.tag}</Text><Text style={need.verified ? styles.verified : styles.pending}>{need.verified ? 'Verified' : 'Verification needed'}</Text></View><Text style={styles.cardTitle}>{need.title}</Text><Text style={styles.meta}>{need.place} · {need.responders} responders</Text><View style={styles.actions}><Text style={styles.actionText}>View need</Text><Text style={styles.actionArrow}>→</Text></View></Pressable>)}

    <View style={styles.footerActions}><Pressable onPress={() => router.push('/profile')}><Text style={styles.footerLink}>Ability profile</Text></Pressable><Pressable onPress={() => router.push('/privacy')}><Text style={styles.footerLink}>Privacy</Text></Pressable><Pressable onPress={() => router.push('/safety')}><Text style={styles.safetyLink}>Safety</Text></Pressable></View>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#F7F8F5'},content:{padding:18,gap:16,paddingBottom:42},
  brandRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},wordmark:{color:'#173F2F',fontWeight:'900',fontSize:25},brandLine:{color:'#718078',fontSize:12,marginTop:2},workspaceButton:{backgroundColor:'#173F2F',paddingHorizontal:13,paddingVertical:10,borderRadius:999},workspaceText:{color:'white',fontWeight:'900',fontSize:12},
  syncBanner:{backgroundColor:'#FFF5D9',borderRadius:14,padding:13,gap:3},syncTitle:{color:'#665322',fontWeight:'900'},syncText:{color:'#776B4C',fontSize:12,lineHeight:17},
  hero:{backgroundColor:'#173F2F',borderRadius:26,padding:22,gap:10},eyebrow:{color:'#A7D8BE',fontWeight:'900',letterSpacing:1.5,fontSize:11},title:{color:'white',fontSize:31,fontWeight:'900',lineHeight:36},subtitle:{color:'#DCEAE3',fontSize:15,lineHeight:22},heroActions:{gap:9,marginTop:5},primary:{backgroundColor:'#F0C45B',paddingVertical:14,paddingHorizontal:16,borderRadius:14},primaryText:{color:'#243A30',textAlign:'center',fontWeight:'900',fontSize:15},heroSecondary:{borderWidth:1,borderColor:'#729986',paddingVertical:13,paddingHorizontal:16,borderRadius:14},heroSecondaryText:{color:'#F0F7F3',textAlign:'center',fontWeight:'900'},
  compass:{backgroundColor:'white',borderRadius:20,padding:16,gap:12},sectionTitle:{color:'#17352B',fontSize:19,fontWeight:'900'},muted:{color:'#718078',fontSize:12,lineHeight:18},compassRow:{flexDirection:'row',gap:8},compassItem:{flex:1,paddingVertical:11,borderRadius:12,backgroundColor:'#E7F1EB',alignItems:'center'},compassText:{color:'#285741',fontWeight:'800',fontSize:12},
  quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},quickCard:{width:'48%',flexGrow:1,backgroundColor:'white',borderRadius:16,padding:14,gap:4},quickTitle:{color:'#17352B',fontWeight:'900'},quickText:{color:'#77847D',fontSize:12,lineHeight:17},
  headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',gap:10},link:{color:'#285741',fontWeight:'900'},card:{backgroundColor:'white',borderRadius:18,padding:16,gap:9},cardTop:{flexDirection:'row',justifyContent:'space-between',gap:10},tag:{color:'#356C52',fontWeight:'800',fontSize:12},verified:{color:'#24724D',fontWeight:'800',fontSize:12},pending:{color:'#9A6423',fontWeight:'800',fontSize:12},cardTitle:{color:'#17352B',fontWeight:'900',fontSize:18,lineHeight:24},meta:{color:'#718078',fontSize:13},actions:{flexDirection:'row',justifyContent:'space-between',paddingTop:4},actionText:{color:'#285741',fontWeight:'900'},actionArrow:{color:'#285741',fontWeight:'900',fontSize:18},
  footerActions:{flexDirection:'row',justifyContent:'center',flexWrap:'wrap',gap:18,paddingVertical:8},footerLink:{color:'#52645B',fontWeight:'800'},safetyLink:{color:'#8A443B',fontWeight:'900'}
});
