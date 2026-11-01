import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StitchBottomNav, StitchTopBar } from '../components/StitchChrome';
import { apiFetch } from '../lib/api';
import { Stitch } from '../lib/stitch-theme';
import { Fieldwork } from '../lib/fieldwork-theme';
import { flushNeedQueue, pendingNeedCount, pendingNeedLocationReviewCount } from '../lib/sync';

type PlatformDescription={lifecycle?:string[];doctrine?:string;[key:string]:unknown};
const fallbackLifecycle=['see','report','verify','diagnose','project','mobilise','execute','measure','maintain','replicate'];
const pathways=[
 {title:'Discover needs',desc:'Explore reports in your community and see which have been verified.',icon:'navigate-outline' as const,path:'/needmap' as const,color:Fieldwork.color.leafSoft},
 {title:'Report a need',desc:'Share an observation with the right location and supporting evidence.',icon:'add-circle-outline' as const,path:'/report' as const,color:Fieldwork.color.goldSoft},
 {title:'Take action',desc:'Open the role-aware workspace for your projects and contributions.',icon:'hand-left-outline' as const,path:'/workspace' as const,color:Fieldwork.color.coralSoft},
 {title:'Your impact',desc:'See the contributions and outcomes supported by real records.',icon:'ribbon-outline' as const,path:'/impact' as const,color:Fieldwork.color.iris},
];

export default function ImpactFeed(){
 const[pendingSync,setPendingSync]=useState(0);
 const[pendingLocationReview,setPendingLocationReview]=useState(0);
 const[refreshing,setRefreshing]=useState(false);
 const[platform,setPlatform]=useState<PlatformDescription>({lifecycle:fallbackLifecycle});
 const[platformReachable,setPlatformReachable]=useState(false);
 async function load(){
  try{const description=await apiFetch<PlatformDescription>('/v1/platform',{},false);setPlatform(description);setPlatformReachable(true)}
  catch{setPlatformReachable(false)}
  try{await flushNeedQueue()}catch{/* Preserve queued reports and retry on refresh. */}
  finally{
   try{const[pending,locationReview]=await Promise.all([pendingNeedCount(),pendingNeedLocationReviewCount()]);
    setPendingSync(pending);setPendingLocationReview(locationReview);
   }catch{/* Storage remains unavailable; never claim a successful sync. */}
  }
 }
 useEffect(()=>{void load()},[]);
 async function refresh(){setRefreshing(true);try{await load()}finally{setRefreshing(false)}}
 const lifecycle=Array.isArray(platform.lifecycle)&&platform.lifecycle.length?platform.lifecycle:fallbackLifecycle;
 return <SafeAreaView style={s.safe} edges={['top','left','right']}><View style={s.screen}>
  <StitchTopBar/>
  <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
   refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void refresh()} tintColor={Stitch.color.secondary}/>}>
   {pendingSync>0&&<Pressable accessibilityRole="button" style={s.syncBanner} onPress={()=>pendingLocationReview>0?router.push({pathname:'/report',params:{reviewQueue:'1'}}):void refresh()}>
    <View style={s.syncIcon}><Ionicons name={pendingLocationReview>0?'location-outline':'cloud-upload-outline'} size={20} color={Stitch.color.tertiary}/></View>
    <View style={s.flex}><Text style={s.syncTitle}>{pendingLocationReview>0?`${pendingLocationReview} observation${pendingLocationReview===1?' needs':'s need'} location review`:`${pendingSync} observation${pendingSync===1?'':'s'} awaiting sync`}</Text>
     <Text style={s.syncText}>{pendingLocationReview>0?'Confirm the intervention coordinates. The preserved report will be updated, not duplicated.':'Tap to retry safely. Your offline reports remain queued until the real API confirms them.'}</Text>
    </View><Ionicons name="chevron-forward" size={19} color={Stitch.color.tertiary}/>
   </Pressable>}
   <View style={s.hero}>
    <View style={s.heroOrb} pointerEvents="none"/>
    <View style={s.heroOrbSmall} pointerEvents="none"/>
    <View style={s.heroBadge}><View style={s.heroBadgeDot}/><Text style={s.heroBadgeText}>SEE IT · OWN IT · SOLVE IT</Text></View>
    <Text style={s.heroTitle}>Change begins with <Text style={s.heroAccent}>someone.</Text>{'\n'}Why not you?</Text>
    <Text style={s.heroLead}>Discover community needs, offer your abilities, and follow the outcome through real evidence.</Text>
    <View style={s.heroActions}>
     <Pressable style={s.heroPrimary} accessibilityRole="button" onPress={()=>router.push('/needmap')}><Ionicons name="compass-outline" size={20} color={Fieldwork.color.textOnLeaf}/><Text style={s.heroPrimaryText}>Explore needs</Text><Ionicons name="arrow-forward" size={18} color={Fieldwork.color.textOnLeaf}/></Pressable>
     <Pressable style={s.heroSecondary} accessibilityRole="button" onPress={()=>router.push('/report')}><Ionicons name="add-outline" size={20} color={Fieldwork.color.leaf}/><Text style={s.heroSecondaryText}>Report a need</Text></Pressable>
    </View>
    <View style={s.heroDivider}/>
    <View style={s.heroFoot}><Ionicons name="shield-checkmark-outline" size={18} color={Fieldwork.color.leaf}/><Text style={s.heroFootText}>Reporting is not verification. Every action has a clear evidence trail.</Text></View>
   </View>
   <View style={s.sectionHeader}><View><Text style={s.eyebrow}>START HERE</Text><Text style={s.sectionTitle}>How will you respond?</Text></View><Text style={s.sectionHint}>Choose your next step</Text></View>
   <View style={s.pathways}>{pathways.map((entry)=><Pressable key={entry.title} accessibilityRole="button" accessibilityLabel={entry.title} style={s.pathway}
    onPress={()=>router.push(entry.path)}><View style={[s.pathwayIcon,{backgroundColor:entry.color}]}><Ionicons name={entry.icon} color={Stitch.color.primary} size={24}/></View>
     <View style={s.flex}><Text style={s.pathwayTitle}>{entry.title}</Text><Text style={s.pathwayText}>{entry.desc}</Text></View><Ionicons name="arrow-forward" color={Stitch.color.secondary} size={19}/></Pressable>)}</View>
   <View style={s.sectionHeader}><View><Text style={s.eyebrow}>THE IRESPOND WAY</Text><Text style={s.sectionTitle}>From need to impact</Text></View></View>
   <View style={s.journey}>
    <Text style={s.journeyText}>The work follows a clear journey. Observation, verification, contribution and outcome are not the same thing.</Text>
    <View style={s.lifecycle}>{lifecycle.map((stage,index)=><View key={`${stage}-${index}`} style={s.stage}><View style={s.stageNumber}><Text style={s.stageNumberText}>{index+1}</Text></View><Text style={s.stageText}>{human(stage)}</Text></View>)}</View>
    <View style={s.liveLine}><View style={[s.liveDot,platformReachable&&s.liveDotGood]}/><Text style={s.liveLabel}>{platformReachable?'Lifecycle loaded from the platform API':'Platform API unavailable · showing documented lifecycle'}</Text></View>
   </View>
   <View style={s.impactCallout}>
    <View style={s.impactCalloutIcon}><Ionicons name="ribbon-outline" size={24} color={Stitch.color.secondary}/></View>
    <View style={s.flex}><Text style={s.impactTitle}>Your impact, backed by evidence</Text>
     <Text style={s.impactText}>Your profile is self-declared. Your verified contributions are backed by platform records. We keep the two separate.</Text>
     <Pressable accessibilityRole="button" onPress={()=>router.push('/impact')} style={s.inlineLink}><Text style={s.inlineLinkText}>See Impact Passport</Text><Ionicons name="arrow-forward" size={17} color={Stitch.color.secondary}/></Pressable>
    </View>
   </View>
   <View style={s.lowerLinks}>
    <Pressable style={s.lowerLink} accessibilityRole="button" onPress={()=>router.push('/catalog')}><Ionicons name="grid-outline" size={20} color={Stitch.color.primary}/><Text style={s.lowerLinkText}>Browse all surfaces</Text><Ionicons name="chevron-forward" size={16} color={Stitch.color.onSurfaceVariant}/></Pressable>
    <Pressable style={s.lowerLink} accessibilityRole="button" onPress={()=>router.push('/workspace')}><Ionicons name="business-outline" size={20} color={Stitch.color.primary}/><Text style={s.lowerLinkText}>Organization & project workspace</Text><Ionicons name="chevron-forward" size={16} color={Stitch.color.onSurfaceVariant}/></Pressable>
   </View>
  </ScrollView><StitchBottomNav/>
 </View></SafeAreaView>
}
function human(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:Fieldwork.color.canvas},screen:{flex:1},
 content:{padding:Fieldwork.space.screen,gap:Fieldwork.space.section,paddingBottom:36},flex:{flex:1},
 hero:{position:'relative',overflow:'hidden',backgroundColor:'#EDF1E2',borderRadius:Fieldwork.radius.hero,padding:25,paddingTop:30,gap:14},
 heroOrb:{position:'absolute',width:260,height:260,borderRadius:130,borderWidth:55,borderColor:'rgba(255,255,255,0.63)',right:-110,top:-140},
 heroOrbSmall:{position:'absolute',width:135,height:135,borderRadius:68,backgroundColor:'rgba(238,190,95,0.18)',right:-50,bottom:-52},
 heroBadge:{flexDirection:'row',alignItems:'center',gap:8},heroBadgeDot:{width:7,height:7,borderRadius:4,backgroundColor:Fieldwork.color.coral},
 heroBadgeText:{...Stitch.type.eyebrow,color:Fieldwork.color.leaf,fontSize:10,letterSpacing:1.1},
 heroTitle:{...Fieldwork.type.display,color:Fieldwork.color.inkStrong,maxWidth:330} ,
 heroAccent:{color:Fieldwork.color.coralText,fontStyle:'italic',fontWeight:'700'},
 heroLead:{fontSize:15,lineHeight:23,color:Fieldwork.color.muted,maxWidth:320},
 heroActions:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:6},
 heroPrimary:{minHeight:50,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:15,backgroundColor:Fieldwork.color.leaf,borderRadius:13},
 heroPrimaryText:{...Stitch.type.bodyBold,color:Fieldwork.color.textOnLeaf},
 heroSecondary:{minHeight:50,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingHorizontal:14,backgroundColor:Fieldwork.color.paper,borderWidth:1,borderColor:'#DCE5D6',borderRadius:13},
 heroSecondaryText:{...Stitch.type.bodyBold,color:Fieldwork.color.leaf},
 heroDivider:{height:1,backgroundColor:'#D3DFD0',marginTop:5},
 heroFoot:{flexDirection:'row',alignItems:'flex-start',gap:9},heroFootText:{...Stitch.type.footnote,flex:1,color:Fieldwork.color.muted,fontSize:12,lineHeight:18},
 sectionHeader:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:9},
 eyebrow:{...Stitch.type.eyebrow,color:Fieldwork.color.leaf,marginBottom:5},
 sectionTitle:{...Stitch.type.headline,color:Fieldwork.color.inkStrong,fontSize:25},
 sectionHint:{...Stitch.type.footnote,color:Stitch.color.onSurfaceVariant,marginBottom:3},
 pathways:{gap:11},
 pathway:{flexDirection:'row',alignItems:'center',gap:13,padding:14,minHeight:102,borderRadius:Fieldwork.radius.card,borderWidth:1,borderColor:Fieldwork.color.border,backgroundColor:Fieldwork.color.paper},
 pathwayIcon:{height:52,width:52,borderRadius:16,justifyContent:'center',alignItems:'center'},
 pathwayTitle:{...Stitch.type.card,color:Stitch.color.primary,fontSize:16},
 pathwayText:{...Stitch.type.footnote,color:Stitch.color.onSurfaceVariant,fontSize:12,lineHeight:18,marginTop:3},
 journey:{backgroundColor:Fieldwork.color.paper,borderWidth:1,borderColor:Fieldwork.color.border,borderRadius:20,padding:18,gap:16},
 journeyText:{...Stitch.type.body,color:Stitch.color.onSurfaceVariant,fontSize:13,lineHeight:20},
 lifecycle:{flexDirection:'row',flexWrap:'wrap',gap:8},
 stage:{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:7,paddingHorizontal:9,borderRadius:99,backgroundColor:'#F0F6F4'},
 stageNumber:{width:22,height:22,borderRadius:11,backgroundColor:'#D6EADF',alignItems:'center',justifyContent:'center'},
 stageNumberText:{fontSize:11,fontWeight:'900',color:'#135237'},
 stageText:{...Stitch.type.tag,color:Stitch.color.primary,fontSize:11},
 liveLine:{flexDirection:'row',alignItems:'center',gap:8},
 liveDot:{width:8,height:8,borderRadius:4,backgroundColor:Stitch.color.amber},liveDotGood:{backgroundColor:Stitch.color.secondary},
 liveLabel:{...Stitch.type.footnote,color:Stitch.color.onSurfaceVariant},
 impactCallout:{flexDirection:'row',gap:13,padding:18,borderRadius:20,backgroundColor:Fieldwork.color.leafSoft,borderWidth:1,borderColor:'#CFE7D9'},
 impactCalloutIcon:{width:44,height:44,borderRadius:14,backgroundColor:'#D5EBDD',alignItems:'center',justifyContent:'center'},
 impactTitle:{...Stitch.type.card,color:'#123F31'},
 impactText:{...Stitch.type.body,fontSize:13,lineHeight:20,color:'#35594D',marginTop:6},
 inlineLink:{flexDirection:'row',alignItems:'center',gap:6,minHeight:44,alignSelf:'flex-start'},
 inlineLinkText:{...Stitch.type.bodyBold,color:Stitch.color.secondary,fontSize:13},
 lowerLinks:{gap:7},
 lowerLink:{flexDirection:'row',alignItems:'center',gap:10,minHeight:48,paddingHorizontal:5},
 lowerLinkText:{...Stitch.type.bodyBold,color:Stitch.color.primary,flex:1,fontSize:13},
 syncBanner:{padding:12,flexDirection:'row',alignItems:'center',gap:10,borderRadius:16,backgroundColor:'#FFF0D4',borderWidth:1,borderColor:'#F1D99B'},
 syncIcon:{width:40,height:40,borderRadius:12,backgroundColor:'#FFE4AA',justifyContent:'center',alignItems:'center'},
 syncTitle:{...Stitch.type.bodyBold,color:Stitch.color.tertiary,fontSize:13},
 syncText:{...Stitch.type.footnote,color:Stitch.color.tertiary,fontSize:11,lineHeight:17,marginTop:2}
});
