import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Project={id:string;sourceNeedId:string;createdBy:string;title:string;summary:string;status:string;currency?:string;estimatedBudgetMinor?:number;targetDays?:number;sdgTags:number[];createdAt:string;updatedAt:string};

export default function ProjectDetail(){
  const{id}=useLocalSearchParams<{id:string}>();const[project,setProject]=useState<Project|null>(null);const[error,setError]=useState('');const[loading,setLoading]=useState(true);
  async function load(){const base=process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/,'');if(!base||!id){setError('Project API is not configured.');setLoading(false);return}setLoading(true);setError('');try{const r=await fetch(`${base}/v1/projects/${encodeURIComponent(id)}`);if(!r.ok)throw new Error(String(r.status));setProject(await r.json() as Project)}catch{setError('This action project could not be loaded.')}finally{setLoading(false)}}
  useEffect(()=>{void load()},[id]);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={()=>router.back()}><Text style={styles.back}>← Back</Text></Pressable>{loading&&<ActivityIndicator/>}{!!error&&<View style={styles.error}><Text style={styles.errorTitle}>Unable to load project</Text><Text style={styles.errorText}>{error}</Text><Pressable onPress={load}><Text style={styles.link}>Try again</Text></Pressable></View>}
    {project&&<><Text style={styles.eyebrow}>ACTION PROJECT · {project.status.toUpperCase()}</Text><Text style={styles.title}>{project.title}</Text><Text style={styles.summary}>{project.summary}</Text>
      <View style={styles.panel}><Metric label="Source need" value={project.sourceNeedId}/><Metric label="SDG alignment" value={project.sdgTags.length?project.sdgTags.map((n)=>`SDG ${n}`).join(' · '):'Not classified'}/><Metric label="Estimated budget" value={project.estimatedBudgetMinor!==undefined?`${project.currency||''} ${(project.estimatedBudgetMinor/100).toLocaleString()}`:'Not estimated yet'}/><Metric label="Target" value={project.targetDays?`${project.targetDays} days`:'Not set'}/></View>
      <View style={styles.notice}><Text style={styles.noticeTitle}>Draft means planning, not permission to spend.</Text><Text style={styles.noticeText}>The project still needs roles, milestones, contribution requirements, approvals where applicable, funding controls, safeguarding checks, and a maintenance owner before execution.</Text></View>
      <View style={styles.next}><Text style={styles.nextTitle}>Next project capabilities</Text>{['Assign community and delivery roles','Break the work into milestones','Publish contribution needs','Set counterpart-funding rules','Track execution and evidence','Validate outcomes and maintenance'].map(x=><Text key={x} style={styles.item}>• {x}</Text>)}</View>
    </>}
  </ScrollView></SafeAreaView>
}
function Metric({label,value}:{label:string;value:string}){return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:20,gap:14,paddingBottom:40},back:{color:'#2D6E9F',fontWeight:'800'},eyebrow:{color:'#2D7A56',fontWeight:'900',letterSpacing:1.2},title:{fontSize:29,lineHeight:35,color:'#17324D',fontWeight:'900'},summary:{fontSize:16,lineHeight:24,color:'#415869'},panel:{backgroundColor:'white',padding:16,borderRadius:18,gap:12},metric:{gap:3},metricLabel:{color:'#667788',fontSize:12,fontWeight:'800'},metricValue:{color:'#17324D',fontWeight:'800'},notice:{backgroundColor:'#FFF7E7',padding:15,borderRadius:15,gap:5},noticeTitle:{color:'#6D4A14',fontWeight:'900'},noticeText:{color:'#7D6848',lineHeight:20},next:{backgroundColor:'#E9F5EF',padding:16,borderRadius:18,gap:7},nextTitle:{color:'#245840',fontWeight:'900',fontSize:18},item:{color:'#416A56',lineHeight:21},error:{backgroundColor:'#FFF0EF',padding:15,borderRadius:15,gap:5},errorTitle:{color:'#8A352F',fontWeight:'900'},errorText:{color:'#76504D'},link:{color:'#2D6E9F',fontWeight:'800'}});
