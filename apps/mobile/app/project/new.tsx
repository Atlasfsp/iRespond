import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAccessToken } from '../../lib/session';

export default function NewProject(){
  const { needId, needTitle } = useLocalSearchParams<{needId:string;needTitle?:string}>();
  const [title,setTitle]=useState(needTitle??'');const[summary,setSummary]=useState('');const[budget,setBudget]=useState('');const[currency,setCurrency]=useState('NGN');const[days,setDays]=useState('30');const[saving,setSaving]=useState(false);
  async function create(){
    const baseUrl=process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/,'');if(!baseUrl||!needId){Alert.alert('Not configured','The project API is not available on this build.');return}
    const token=await getAccessToken();if(!token){router.push('/signin');return}
    setSaving(true);try{
      const major=budget.trim()?Number(budget):undefined;const estimatedBudgetMinor=major===undefined?undefined:Math.round(major*100);const targetDays=days.trim()?Number(days):undefined;
      if(major!==undefined&&(!Number.isFinite(major)||major<0)){Alert.alert('Check budget','Enter a non-negative budget amount.');return}
      if(targetDays!==undefined&&(!Number.isInteger(targetDays)||targetDays<=0)){Alert.alert('Check timeline','Enter the expected number of days.');return}
      const response=await fetch(`${baseUrl}/v1/needs/${encodeURIComponent(needId)}/projects`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({title,summary,currency,estimatedBudgetMinor,targetDays})});
      if(response.status===401){router.push('/signin');return}if(response.status===409){const body=await response.json().catch(()=>({error:'Project conversion is not available.'})) as {error?:string};Alert.alert('Project not created',body.error??'The need may require verification first.');return}if(!response.ok)throw new Error(`project ${response.status}`);
      const project=await response.json() as {id:string};router.replace({pathname:'/project/[id]',params:{id:project.id}});
    }catch{Alert.alert('Project not created','Check connectivity and try again.')}finally{setSaving(false)}
  }
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Pressable onPress={()=>router.back()}><Text style={styles.back}>← Back</Text></Pressable><Text style={styles.eyebrow}>ACTION PROJECT</Text><Text style={styles.title}>Turn a verified need into a transparent plan.</Text><Text style={styles.help}>This creates a draft project. Funding and execution do not start automatically.</Text>
    <Field label="Project title" value={title} onChangeText={setTitle}/><Field label="What will this project achieve?" value={summary} onChangeText={setSummary} multiline/>
    <View style={styles.row}><View style={styles.flex}><Field label="Estimated budget" value={budget} onChangeText={setBudget} keyboardType="decimal-pad"/></View><View style={styles.currency}><Field label="Currency" value={currency} onChangeText={(v:string)=>setCurrency(v.toUpperCase().slice(0,3))}/></View></View>
    <Field label="Target days" value={days} onChangeText={setDays} keyboardType="number-pad"/>
    <View style={styles.notice}><Text style={styles.noticeTitle}>Community ownership</Text><Text style={styles.noticeText}>The next project slices will assign community sponsors, project managers, technical reviewers, finance stewards, volunteers and maintenance owners. Money is only one contribution type.</Text></View>
    <Pressable style={[styles.primary,saving&&styles.disabled]} disabled={saving} onPress={create}><Text style={styles.primaryText}>{saving?'Creating draft…':'Create draft action project'}</Text></Pressable>
  </ScrollView></SafeAreaView>
}
function Field(props:any){return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={[styles.input,props.multiline&&styles.multi]} placeholderTextColor="#8A98A5"/></View>}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:20,gap:14,paddingBottom:40},back:{color:'#2D6E9F',fontWeight:'800'},eyebrow:{color:'#2D7A56',fontWeight:'900',letterSpacing:1.5},title:{fontSize:28,lineHeight:34,fontWeight:'900',color:'#17324D'},help:{color:'#667788',lineHeight:21},field:{gap:6},label:{fontWeight:'800',color:'#334B5D'},input:{backgroundColor:'white',borderWidth:1,borderColor:'#D4DEE6',borderRadius:13,padding:13,color:'#17324D'},multi:{minHeight:110,textAlignVertical:'top'},row:{flexDirection:'row',gap:10},flex:{flex:1},currency:{width:100},notice:{backgroundColor:'#E9F5EF',padding:15,borderRadius:15,gap:4},noticeTitle:{color:'#245840',fontWeight:'900'},noticeText:{color:'#416A56',lineHeight:20},primary:{backgroundColor:'#153B5B',padding:16,borderRadius:14},primaryText:{color:'white',fontWeight:'900',textAlign:'center'},disabled:{opacity:.55}});
