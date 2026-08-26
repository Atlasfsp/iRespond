import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { flushNeedQueue, pendingNeedCount } from '../lib/sync';

const needs = [
  { id: 'water-001', tag: 'Water & sanitation', title: 'Community water point needs repair', place: 'Surulere, Lagos', verified: true, responders: 18 },
  { id: 'school-001', tag: 'Education', title: 'Restore books and lighting in a school library', place: 'Ikeja, Lagos', verified: false, responders: 7 },
  { id: 'care-001', tag: 'Community care', title: 'Weekly support rota for elderly neighbours', place: 'Yaba, Lagos', verified: true, responders: 11 }
];

export default function ImpactFeed() {
  const [pendingSync, setPendingSync] = useState(0);
  useEffect(() => { let active = true; async function sync() { await flushNeedQueue(); const count = await pendingNeedCount(); if (active) setPendingSync(count); } void sync(); return () => { active = false; }; }, []);
  async function retrySync() { await flushNeedQueue(); setPendingSync(await pendingNeedCount()); }
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.topActions}>
      <Pressable onPress={() => router.push('/impact')}><Text style={styles.topLink}>Impact Passport</Text></Pressable>
      <Pressable onPress={() => router.push('/notifications')}><Text style={styles.topLink}>Notifications</Text></Pressable>
      <Pressable onPress={() => router.push('/profile')}><Text style={styles.topLink}>Ability Profile</Text></Pressable>
      <Pressable onPress={() => router.push('/contributions')}><Text style={styles.topLink}>My Offers</Text></Pressable>
      <Pressable onPress={() => router.push('/needmap')}><Text style={styles.topLink}>NeedMap</Text></Pressable>
      <Pressable onPress={() => router.push({pathname:'/report-safety',params:{subjectType:'platform',subjectId:'general'}})}><Text style={styles.safetyLink}>Safety</Text></Pressable>
    </View>
    {pendingSync > 0 && <Pressable style={styles.syncBanner} onPress={retrySync}><Text style={styles.syncTitle}>{pendingSync} observation{pendingSync === 1 ? '' : 's'} waiting to sync</Text><Text style={styles.syncText}>Tap to retry. Your reports remain safely queued on this device.</Text></Pressable>}
    <View style={styles.hero}><Text style={styles.eyebrow}>I RESPOND</Text><Text style={styles.title}>What can you change where you are?</Text><Text style={styles.subtitle}>See it. Own it. Solve it. Prove the impact.</Text><Pressable style={styles.primary} onPress={() => router.push('/report')} accessibilityRole="button"><Text style={styles.primaryText}>Report a community need</Text></Pressable></View>
    <View style={styles.compass}><Text style={styles.sectionTitle}>Your 3P Action Compass</Text><View style={styles.compassRow}>{['Place', 'Position', 'Possessions'].map((item) => <View key={item} style={styles.compassItem}><Text style={styles.compassText}>{item}</Text></View>)}</View></View>
    <View style={styles.headerRow}><Text style={styles.sectionTitle}>Needs near you</Text><Pressable onPress={() => router.push('/needmap')}><Text style={styles.link}>Open NeedMap →</Text></Pressable></View>
    {needs.map((need) => <Pressable key={need.id} style={styles.card} accessibilityRole="button"><View style={styles.cardTop}><Text style={styles.tag}>{need.tag}</Text><Text style={need.verified ? styles.verified : styles.pending}>{need.verified ? 'Verified' : 'Verification needed'}</Text></View><Text style={styles.cardTitle}>{need.title}</Text><Text style={styles.meta}>{need.place} · {need.responders} responders</Text><View style={styles.actions}><Text style={styles.actionText}>I can help</Text><Text style={styles.actionText}>Follow outcome</Text></View></Pressable>)}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({safe:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:18,gap:16,paddingBottom:40},topActions:{flexDirection:'row',justifyContent:'flex-end',flexWrap:'wrap',gap:14},topLink:{color:'#2D6E9F',fontWeight:'800'},safetyLink:{color:'#8A352F',fontWeight:'900'},syncBanner:{backgroundColor:'#FFF7E7',borderRadius:14,padding:13,gap:3},syncTitle:{color:'#6D4A14',fontWeight:'900'},syncText:{color:'#7D6848',fontSize:12,lineHeight:17},hero:{backgroundColor:'#153B5B',borderRadius:24,padding:22,gap:10},eyebrow:{color:'#8ED1B2',fontWeight:'800',letterSpacing:1.8,fontSize:12},title:{color:'white',fontSize:30,fontWeight:'800',lineHeight:35},subtitle:{color:'#D6E2EB',fontSize:15,lineHeight:22},primary:{backgroundColor:'#F2B544',paddingVertical:14,paddingHorizontal:16,borderRadius:14,marginTop:8},primaryText:{color:'#16334B',textAlign:'center',fontWeight:'800',fontSize:16},compass:{backgroundColor:'white',borderRadius:20,padding:16,gap:12},sectionTitle:{color:'#17324D',fontSize:19,fontWeight:'800'},compassRow:{flexDirection:'row',gap:8},compassItem:{flex:1,paddingVertical:12,borderRadius:12,backgroundColor:'#E9F5EF',alignItems:'center'},compassText:{color:'#245840',fontWeight:'700',fontSize:12},headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},link:{color:'#2D6E9F',fontWeight:'700'},card:{backgroundColor:'white',borderRadius:18,padding:16,gap:9},cardTop:{flexDirection:'row',justifyContent:'space-between',gap:10},tag:{color:'#2D6E9F',fontWeight:'700',fontSize:12},verified:{color:'#24724D',fontWeight:'700',fontSize:12},pending:{color:'#9A6423',fontWeight:'700',fontSize:12},cardTitle:{color:'#142B3E',fontWeight:'800',fontSize:18,lineHeight:24},meta:{color:'#667788',fontSize:13},actions:{flexDirection:'row',gap:18,paddingTop:5},actionText:{color:'#2D6E9F',fontWeight:'800'}});