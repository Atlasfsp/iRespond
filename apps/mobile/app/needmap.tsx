import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const needs = [
  { id:'water-001', title:'Community water point needs repair', place:'Surulere, Lagos', distance:'1.2 km', state:'Verified', sdg:'SDG 6' },
  { id:'school-001', title:'Restore books and lighting in a school library', place:'Ikeja, Lagos', distance:'4.8 km', state:'Verification needed', sdg:'SDG 4' },
  { id:'care-001', title:'Weekly support rota for elderly neighbours', place:'Yaba, Lagos', distance:'6.1 km', state:'Verified', sdg:'SDG 3' }
];

export default function NeedMap() {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>← Back</Text></Pressable>
    <Text style={styles.eyebrow}>NEEDMAP</Text>
    <Text style={styles.title}>See what needs attention around you.</Text>
    <View style={styles.map}><Text style={styles.mapTitle}>Map surface</Text><Text style={styles.mapText}>Geospatial tiles and clustered pins will be connected to the backend service in the next persistence slice. This view already models nearby verified and unverified needs.</Text></View>
    {needs.map((need)=><View key={need.id} style={styles.card}><View style={styles.row}><Text style={styles.sdg}>{need.sdg}</Text><Text style={need.state==='Verified'?styles.verified:styles.pending}>{need.state}</Text></View><Text style={styles.cardTitle}>{need.title}</Text><Text style={styles.meta}>{need.place} · {need.distance}</Text><View style={styles.actions}><Text style={styles.action}>View evidence</Text><Text style={styles.action}>I can help</Text></View></View>)}
  </ScrollView></SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:20,gap:14},back:{color:'#2D6E9F',fontWeight:'800'},eyebrow:{color:'#2D7A56',fontWeight:'900',letterSpacing:1.5},title:{color:'#17324D',fontSize:28,lineHeight:34,fontWeight:'900'},map:{backgroundColor:'#DDEBF4',borderRadius:20,minHeight:210,padding:20,justifyContent:'center',gap:8},mapTitle:{color:'#17324D',fontSize:22,fontWeight:'900'},mapText:{color:'#526778',lineHeight:20},card:{backgroundColor:'white',borderRadius:18,padding:16,gap:8},row:{flexDirection:'row',justifyContent:'space-between'},sdg:{color:'#2D6E9F',fontWeight:'800'},verified:{color:'#24724D',fontWeight:'800'},pending:{color:'#9A6423',fontWeight:'800'},cardTitle:{color:'#142B3E',fontSize:18,lineHeight:24,fontWeight:'900'},meta:{color:'#667788'},actions:{flexDirection:'row',gap:18},action:{color:'#2D6E9F',fontWeight:'800'}});
