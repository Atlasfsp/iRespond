import {VideoPreview} from '../components/VideoPreview';
import {useEffect,useRef,useState} from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {router} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Alert,Image,PermissionsAndroid,Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {StitchBottomNav,StitchTopBar} from '../components/StitchChrome';
import {clearNeedDraft,loadNeedDraft,saveNeedDraft} from '../lib/drafts';
import {persistMedia,discardPrivateMedia,type CaptureContext,type EvidenceAttachment} from '../lib/media';
import {validateMediaSelection} from '../../web/field-report-policy.mjs';
import {flushNeedQueue,queueNeedForSync,getPendingSubmissions} from '../lib/sync';
import {Stitch} from '../lib/stitch-theme';

export default function EvidenceCapture(){
 const[items,setItems]=useState<EvidenceAttachment[]>([]),[stage,setStage]=useState<CaptureContext['stage']>('before');
 const[restoring,setRestoring]=useState(true),[restoreError,setRestoreError]=useState(false),[attempt,setAttempt]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const inFlight=useRef(false);const blocked=restoring||restoreError||busy;
 useEffect(()=>{let active=true;setRestoring(true);setRestoreError(false);loadNeedDraft().then(draft=>{if(active)setItems(draft?.attachments??(draft?.evidenceUris||[]).map((uri,i)=>({id:`legacy-${i}`,uri,kind:/\.(mp4|mov)(\?|$)|^data:video\//i.test(uri)?'video':'photo'})))}).catch(()=>{if(active)setRestoreError(true)}).finally(()=>{if(active)setRestoring(false)});return()=>{active=false}},[attempt]);
 async function persist(next:EvidenceAttachment[]){const draft=await loadNeedDraft();if(!draft)throw new Error('Return to Report and describe the need first.');await saveNeedDraft({...draft,attachments:next,evidenceUris:next.map(item=>item.uri),updatedAt:new Date().toISOString()})}
 async function save(){if(blocked)return;try{await persist(items);setMessage('Evidence saved to draft.')}catch(error){setMessage(error instanceof Error?error.message:'Draft could not be saved. Keep this screen open and retry.')}}
 async function capture(video:boolean,library=false){
  if(blocked||inFlight.current)return;
  const cap=validateMediaSelection([...items,{kind:video?'video':'photo',durationSeconds:video?1:undefined}]);if(cap){setMessage(cap);return}
  inFlight.current=true;setBusy(true);setMessage('');
  try{
   const permission=library?await ImagePicker.requestMediaLibraryPermissionsAsync():await ImagePicker.requestCameraPermissionsAsync();
   if(!permission.granted)throw new Error(`${library?'Photo library':'Camera'} permission was not granted. You can submit without media or change permissions and retry.`);
   if(video&&!library&&Platform.OS==='android'){const microphone=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);if(microphone!==PermissionsAndroid.RESULTS.GRANTED)throw new Error('Microphone permission was not granted. You can take photos instead.');}
   // Read permission before opening the camera; a denied fix is never replaced by report coordinates.
   const locationPermission=await Location.requestForegroundPermissionsAsync();
   const result=library?await ImagePicker.launchImageLibraryAsync({mediaTypes:video?['videos']:['images'],quality:.6,allowsMultipleSelection:false}):await ImagePicker.launchCameraAsync({mediaTypes:video?['videos']:['images'],quality:.6,videoMaxDuration:30,exif:false});
   if(result.canceled)return;const asset=result.assets[0];if(!asset)return;if(asset.mimeType&&!['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'].includes(asset.mimeType.toLowerCase()))throw new Error('Choose JPEG, PNG or WebP photos, or MP4/MOV video. This media format is not supported.');
   const context:CaptureContext={origin:library?'library':'camera',recordedAt:new Date().toISOString(),stage,locationStatus:locationPermission.granted?'unavailable':'denied'};
   if(video)context.durationSeconds=asset.duration==null?undefined:asset.duration/1000;
   if(locationPermission.granted){try{const fix=await Promise.race([Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High}),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Location timed out')),15000))]);context.latitude=fix.coords.latitude;context.longitude=fix.coords.longitude;context.accuracyMeters=fix.coords.accuracy??undefined;context.locationStatus='captured'}catch{/* Explicit unavailable state is retained. */}}
   const id=`attachment-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
   const preflight=validateMediaSelection([{kind:video?'video':'photo',sizeBytes:asset.fileSize,durationSeconds:context.durationSeconds}]);if(preflight)throw new Error(preflight);
   const copied=await persistMedia(asset.uri,id,video);
   const item:EvidenceAttachment={id,kind:video?'video':'photo',...copied,contentType:asset.mimeType||copied.contentType,captureContext:context};
   const next=[...items,item];const invalid=validateMediaSelection(next.map(x=>({...x,durationSeconds:x.captureContext?.durationSeconds})));if(invalid){await discardPrivateMedia(copied.uri).catch(()=>{});throw new Error(invalid)}
   setItems(next);try{await persist(next);setMessage('Attachment saved. Review its capture details below.')}catch{setMessage('Attachment is on this screen but could not be saved. Keep this screen open and retry Save evidence to draft.');}
  }catch(error){setMessage(error instanceof Error?error.message:'Capture failed. Retry or continue without media.')}finally{inFlight.current=false;setBusy(false)}
 }
 async function remove(id:string){
  if(blocked||inFlight.current)return;inFlight.current=true;setBusy(true);const removed=items.find(item=>item.id===id);const next=items.filter(item=>item.id!==id);
  try{await persist(next);setItems(next);setMessage('Attachment removed from this draft.');try{const pending=await getPendingSubmissions();if(removed&&!next.some(item=>item.uri===removed.uri)&&!pending.some(item=>item.draft.evidenceUris.includes(removed.uri)))await discardPrivateMedia(removed.uri)}catch{setMessage('Attachment removed; private-file cleanup could not finish. The retained copy has not been uploaded.')}}catch{setMessage('Could not save removal. The original attachment remains in the draft.')}finally{inFlight.current=false;setBusy(false)}
 }
 async function submit(){if(blocked||inFlight.current)return;const invalid=validateMediaSelection(items.map(x=>({...x,durationSeconds:x.captureContext?.durationSeconds})));if(invalid){setMessage(invalid);return}inFlight.current=true;setBusy(true);try{await persist(items);const draft=await loadNeedDraft();if(!draft)throw new Error('Report draft not found.');const queued=await queueNeedForSync(draft);await clearNeedDraft();const result=await flushNeedQueue();const synced=result.syncedKeys.includes(queued.idempotencyKey);if(Platform.OS==='web'){router.replace('/submissions');return}Alert.alert(synced?'Observation submitted':'Saved for secure sync',synced?'Your observation reached iRespond. Evidence still requires independent review.':'Your report and attachments are retained in the device queue. Sign in and retry from My submissions when connected.',[{text:'View submissions',onPress:()=>router.replace('/submissions')}]);}catch(error){setMessage(error instanceof Error?error.message:'Submission failed. Retry before leaving.')}finally{inFlight.current=false;setBusy(false)}}
 return <SafeAreaView style={s.safe} edges={['top','left','right']}><View style={s.screen}><StitchTopBar title="Evidence — step 2 of 2" showBack/><ScrollView contentContainerStyle={s.content}>
 <Text style={s.title}>Show the intervention clearly.</Text><Text style={s.body}>Up to 4 photos (10 MB each) and 1 video (30 seconds, 25 MB). Media is optional. Avoid identifiable vulnerable people and sensitive information; obtain appropriate consent.</Text>
 <Text style={s.body}>Captured photos may retain device metadata. Time and location below are device-reported capture information, not verified proof. Library media time and location describe attachment, not the original capture. Exact capture coordinates are sent with protected evidence.</Text>
 {restoring&&<Text>Restoring saved evidence…</Text>}{restoreError&&<View><Text accessibilityRole="alert">Saved evidence could not be restored. Retry before changing this draft.</Text><Button title="Retry restoring evidence" onPress={()=>setAttempt(n=>n+1)}/></View>}
 <Text style={s.section}>Intervention stage for new attachments</Text><View style={s.row} accessibilityRole="radiogroup" accessibilityLabel="Intervention stage">{(['before','during','after'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:stage===value,disabled:blocked}} disabled={blocked} onPress={()=>setStage(value)} style={[s.button,stage===value&&s.selected]}><Text style={s.label}>{value}</Text></Pressable>)}</View>
 <View style={s.row}><Button title="Take a photo" disabled={blocked||items.filter(x=>x.kind==='photo').length>=4} onPress={()=>void capture(false)}/><Button title="Record video" disabled={blocked||items.some(x=>x.kind==='video')} onPress={()=>void capture(true)}/><Button title="Choose photo" disabled={blocked||items.filter(x=>x.kind==='photo').length>=4} onPress={()=>void capture(false,true)}/><Button title="Choose video" disabled={blocked||items.some(x=>x.kind==='video')} onPress={()=>void capture(true,true)}/></View>
 <Text accessibilityLiveRegion="polite" style={s.body}>{busy?'Working — please keep this screen open.':`${items.filter(x=>x.kind==='photo').length}/4 photos · ${items.filter(x=>x.kind==='video').length}/1 video`}</Text>{!!message&&<Text accessibilityRole="alert" style={s.message}>{message}</Text>}
 {items.length>0&&<Text style={s.section}>Evidence attached</Text>}{items.map((item,i)=><View key={item.id} style={s.card}>{item.kind==='photo'&&<View><Image accessibilityLabel={`Attached evidence ${i+1}`} source={{uri:item.uri}} style={s.image}/><View style={s.stamp}><Text style={s.stampText}>{captureLabel(item)}</Text></View></View>}<Text style={s.body}>{item.kind==='video'?'Video · ':''}{captureLabel(item)}</Text>{item.kind==='video'&&<VideoPreview uri={item.uri}/>}<Button title={`Remove attachment ${i+1}`} disabled={blocked} onPress={()=>void remove(item.id)}/></View>)}
 <Button title="Save evidence to draft" disabled={blocked} onPress={()=>void save()}/><Button title="Submit observation" disabled={blocked} onPress={()=>void submit()}/><Text style={s.body}>Submission creates an observation, not a verified need. Upload and moderation status remain separate.</Text>
 </ScrollView><StitchBottomNav/></View></SafeAreaView>;
}
function captureLabel(item:EvidenceAttachment){
 const c=item.captureContext;if(!c)return 'Legacy attachment — original capture time and location unknown';
 const timestamp=Number.isFinite(Date.parse(c.recordedAt))?new Date(c.recordedAt).toISOString():'Time unavailable';
 const coordinate=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(6):'unknown';
 const accuracy=typeof c.accuracyMeters==='number'&&Number.isFinite(c.accuracyMeters)?` ±${Math.round(c.accuracyMeters)} m`:'';
 const duration=typeof c.durationSeconds==='number'&&Number.isFinite(c.durationSeconds)?` · ${c.durationSeconds.toFixed(1)} s`:'';
 return `${c.stage} · ${c.origin==='library'?'Attached':'Recorded'} ${timestamp} · ${c.locationStatus==='captured'?`${coordinate(c.latitude)}, ${coordinate(c.longitude)}${accuracy}`:`Location ${c.locationStatus}`}${duration}`;
}
function Button({title,disabled,onPress}:{title:string;disabled?:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:!!disabled}} disabled={disabled} onPress={onPress} style={[s.button,disabled&&s.disabled]}><Text style={s.label}>{title}</Text></Pressable>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:Stitch.color.background},screen:{flex:1},content:{padding:20,gap:16,paddingBottom:50},title:{...Stitch.type.hero,color:Stitch.color.primary},section:{...Stitch.type.section,color:Stitch.color.primary},body:{...Stitch.type.body,color:Stitch.color.onSurfaceVariant},row:{flexDirection:'row',flexWrap:'wrap',gap:10},button:{minHeight:48,padding:14,borderRadius:12,backgroundColor:Stitch.color.primaryContainer,justifyContent:'center'},label:{...Stitch.type.bodyBold,color:Stitch.color.onPrimary},disabled:{opacity:.45},selected:{borderWidth:3,borderColor:Stitch.color.secondary},message:{...Stitch.type.body,color:Stitch.color.primary,padding:12,borderWidth:1,borderColor:Stitch.color.outlineVariant},card:{gap:12,padding:12,borderRadius:16,borderWidth:1,borderColor:Stitch.color.outlineVariant},image:{width:'100%',height:240,resizeMode:'contain',backgroundColor:Stitch.color.surfaceHigh},stamp:{backgroundColor:'#102B32',padding:8},stampText:{color:'#FFFFFF',fontSize:12}});
