import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { NeedDraft } from './drafts';
import { parseInterventionCoordinates, type CoordinateSource } from './coordinates';
import { getAccessToken } from './session';

const QUEUE_KEY = 'irespond.sync-queue.v1';
const ACTOR_KEY = 'irespond.local-actor-id.v1';

export type QueuedNeed = {
  idempotencyKey: string;
  draft: NeedDraft;
  queuedAt: string;
  attempts: number;
  serverNeedId?: string;
  uploadedEvidenceUris?: string[];
};

type CreatedNeed = { id: string };
type InitiatedUpload = { evidenceId: string; uploadUrl: string; method: string; headers: Record<string,string> };

function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,12)}`; }

export async function getLocalActorId() {
  const existing = await SecureStore.getItemAsync(ACTOR_KEY);
  if (existing) return existing;
  const created = makeId('mobile');
  await SecureStore.setItemAsync(ACTOR_KEY, created);
  return created;
}

async function loadQueue(): Promise<QueuedNeed[]> { const raw=await AsyncStorage.getItem(QUEUE_KEY); return raw ? (JSON.parse(raw) as QueuedNeed[]) : []; }
async function saveQueue(items: QueuedNeed[]) { await AsyncStorage.setItem(QUEUE_KEY,JSON.stringify(items)); }

export async function queueNeedForSync(draft: NeedDraft) {
  const coordinates=parseInterventionCoordinates(draft.latitude,draft.longitude);
  if(!coordinates||!draft.locationConfirmedAt)throw new Error('A confirmed intervention location is required before this report can sync.');
  const queue=await loadQueue();const item:QueuedNeed={idempotencyKey:makeId('need'),draft:{...draft,...coordinates},queuedAt:new Date().toISOString(),attempts:0,uploadedEvidenceUris:[]};await saveQueue([...queue,item]);return item;
}

export type ConfirmedNeedLocation = {
  latitude: number;
  longitude: number;
  locationLabel: string;
  locationSource: CoordinateSource;
  locationAccuracyMeters?: number;
  locationCapturedAt?: string;
  locationConfirmedAt: string;
};

function needsLocationReview(item: QueuedNeed) {
  return !item.serverNeedId && (!item.draft.locationConfirmedAt || !parseInterventionCoordinates(item.draft.latitude,item.draft.longitude));
}

export async function pendingNeedLocationReviewCount() {
  return (await loadQueue()).filter(needsLocationReview).length;
}

export async function getNextNeedLocationReview() {
  return (await loadQueue()).find(needsLocationReview) ?? null;
}

export async function confirmQueuedNeedLocation(idempotencyKey: string, location: ConfirmedNeedLocation) {
  const coordinates=parseInterventionCoordinates(location.latitude,location.longitude);
  if(!coordinates||!location.locationConfirmedAt)throw new Error('Valid confirmed coordinates are required.');
  const queue=await loadQueue();const index=queue.findIndex(item=>item.idempotencyKey===idempotencyKey&&!item.serverNeedId);
  if(index<0)throw new Error('The pending observation is no longer available for location review.');
  const current=queue[index];const updated:QueuedNeed={...current,draft:{...current.draft,...location,...coordinates}};queue[index]=updated;await saveQueue(queue);return updated;
}

export type SyncResult={synced:number;remaining:number;offline:boolean;syncedKeys:string[]};

export async function flushNeedQueue():Promise<SyncResult>{
  const baseUrl=process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/,'');const queue=await loadQueue();if(!baseUrl||queue.length===0)return{synced:0,remaining:queue.length,offline:!baseUrl,syncedKeys:[]};
  const actorId=await getLocalActorId();const token=await getAccessToken();const remaining:QueuedNeed[]=[];const syncedKeys:string[]=[];let synced=0;
  for(const original of queue){let item={...original,uploadedEvidenceUris:[...(original.uploadedEvidenceUris??[])]};try{
      if(!item.serverNeedId){const coordinates=parseInterventionCoordinates(item.draft.latitude,item.draft.longitude);if(!coordinates||!item.draft.locationConfirmedAt){remaining.push(item);continue;}const response=await fetch(`${baseUrl}/v1/needs`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':item.idempotencyKey},body:JSON.stringify({title:item.draft.title,description:item.draft.description,category:item.draft.category??'community',latitude:coordinates.latitude,longitude:coordinates.longitude,reporterId:actorId,sdgTags:[]})});if(!response.ok)throw new Error(`need sync ${response.status}`);const created=(await response.json()) as CreatedNeed;item.serverNeedId=created.id;}
      const pendingEvidence=item.draft.evidenceUris.filter((uri)=>!item.uploadedEvidenceUris?.includes(uri));
      if(pendingEvidence.length>0&&!token){remaining.push(item);continue;}
      for(const uri of pendingEvidence){if(!token)break;await uploadEvidence(baseUrl,item.serverNeedId!,uri,token);item.uploadedEvidenceUris=[...(item.uploadedEvidenceUris??[]),uri];}
      const allEvidenceDone=item.draft.evidenceUris.every((uri)=>item.uploadedEvidenceUris?.includes(uri));if(allEvidenceDone){synced+=1;syncedKeys.push(item.idempotencyKey)}else remaining.push(item);
    }catch{remaining.push({...item,attempts:item.attempts+1});}}
  await saveQueue(remaining);return{synced,remaining:remaining.length,offline:false,syncedKeys};
}

async function uploadEvidence(baseUrl:string,needId:string,uri:string,token:string){
  const local=await fetch(uri);if(!local.ok)throw new Error('local evidence unavailable');const blob=await local.blob();const contentType=allowedType(blob.type)||inferType(uri);if(!contentType)throw new Error('unsupported evidence type');
  const initiate=await fetch(`${baseUrl}/v1/needs/${encodeURIComponent(needId)}/evidence/uploads`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({contentType,sizeBytes:blob.size})});if(!initiate.ok)throw new Error(`evidence initiate ${initiate.status}`);const upload=(await initiate.json()) as InitiatedUpload;
  const put=await fetch(upload.uploadUrl,{method:'PUT',headers:{...upload.headers,'Content-Type':contentType},body:blob});if(!put.ok)throw new Error(`evidence upload ${put.status}`);
  const complete=await fetch(`${baseUrl}/v1/needs/${encodeURIComponent(needId)}/evidence/${encodeURIComponent(upload.evidenceId)}/complete`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});if(!complete.ok)throw new Error(`evidence complete ${complete.status}`);
}

function allowedType(value:string){const v=value.toLowerCase();return['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'].includes(v)?v:'';}
function inferType(uri:string){const path=uri.toLowerCase().split('?')[0];if(path.endsWith('.jpg')||path.endsWith('.jpeg'))return'image/jpeg';if(path.endsWith('.png'))return'image/png';if(path.endsWith('.webp'))return'image/webp';if(path.endsWith('.mp4'))return'video/mp4';if(path.endsWith('.mov'))return'video/quicktime';return'';}
export async function pendingNeedCount(){return(await loadQueue()).length;
}
