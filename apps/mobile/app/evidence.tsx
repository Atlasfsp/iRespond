import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadNeedDraft, saveNeedDraft } from '../lib/drafts';

export default function EvidenceCapture() {
  const [evidenceUris, setEvidenceUris] = useState<string[]>([]);

  async function capturePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission not granted', 'You can continue the report without a photo and add evidence later.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, exif: false });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (uri) setEvidenceUris((current) => [...current, uri]);
  }

  async function saveEvidence() {
    const current = await loadNeedDraft();
    if (!current) {
      Alert.alert('No report draft found', 'Return to the report screen and describe the need first.');
      return;
    }
    await saveNeedDraft({ ...current, evidenceUris, updatedAt: new Date().toISOString() });
    Alert.alert('Evidence saved', 'Evidence is stored locally with the report draft until submission and verification are implemented.');
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>← Back</Text></Pressable>
    <Text style={styles.eyebrow}>EVIDENCE</Text>
    <Text style={styles.title}>Show the situation without exploiting the people affected.</Text>
    <View style={styles.notice}><Text style={styles.noticeTitle}>Dignity first</Text><Text style={styles.noticeText}>Do not photograph children, private medical information, abuse survivors, or identifiable vulnerable people without appropriate consent. A useful report can focus on the condition, asset, environment, or public-space problem instead.</Text></View>
    <Pressable style={styles.primary} onPress={capturePhoto}><Text style={styles.primaryText}>Take a photo</Text></Pressable>
    <View style={styles.grid}>{evidenceUris.map((uri)=><Image key={uri} source={{uri}} style={styles.image} />)}</View>
    <Pressable style={styles.secondary} onPress={saveEvidence}><Text style={styles.secondaryText}>Save evidence to draft</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:20,gap:14},back:{color:'#2D6E9F',fontWeight:'800'},eyebrow:{color:'#2D7A56',fontWeight:'900',letterSpacing:1.5},title:{color:'#17324D',fontSize:28,lineHeight:34,fontWeight:'900'},notice:{backgroundColor:'#FFF7E7',borderRadius:16,padding:15,gap:5},noticeTitle:{color:'#6D4A14',fontWeight:'900'},noticeText:{color:'#7D6848',lineHeight:20},primary:{backgroundColor:'#153B5B',padding:15,borderRadius:14},primaryText:{color:'white',fontWeight:'900',textAlign:'center'},secondary:{borderWidth:1,borderColor:'#9CB8CD',padding:15,borderRadius:14},secondaryText:{color:'#2D6E9F',fontWeight:'900',textAlign:'center'},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},image:{width:104,height:104,borderRadius:12}});
