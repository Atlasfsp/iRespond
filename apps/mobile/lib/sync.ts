import * as Crypto from 'expo-crypto';
import {apiBaseUrl} from './environment';
import {discardPrivateMedia,type EvidenceAttachment} from './media';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {loadNeedDraft,saveNeedDraft, type NeedDraft} from './drafts';
import {validateMediaSelection} from '../../web/field-report-policy.mjs';
import { parseInterventionCoordinates, type CoordinateSource } from './coordinates';
import { getDeviceItem, setDeviceItem } from './device-store';
import { getAccessToken } from './session';

const HISTORY_KEY='irespond.submissions.v1';
const QUEUE_KEY = 'irespond.sync-queue.v1';
const ACTOR_KEY = 'irespond.local-actor-id.v1';
let queueOperationTail: Promise<void> = Promise.resolve();

export type QueuedNeed = {
  idempotencyKey: string;
  draft: NeedDraft;
  queuedAt: string;
  attempts: number;
  lastError?: string;
  serverNeedId?: string;
  uploadedEvidenceUris?: string[];
};

type CreatedNeed = { id: string };
type InitiatedUpload = { evidenceId: string; uploadUrl: string; method: string; headers: Record<string,string>; completed?:boolean };

function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,12)}`; }

export async function getLocalActorId() {
  const existing = await getDeviceItem(ACTOR_KEY);
  if (existing) return existing;
  const created = makeId('mobile');
  await setDeviceItem(ACTOR_KEY, created);
  return created;
}

async function loadQueue(): Promise<QueuedNeed[]> { const raw=await AsyncStorage.getItem(QUEUE_KEY); const items=raw?JSON.parse(raw):[];if(!Array.isArray(items)||items.some(x=>!x||typeof x.idempotencyKey!=='string'||!x.draft||!Array.isArray(x.draft.evidenceUris)))throw new Error('Saved queue could not be read safely. Do not clear device storage; retry or contact support.');return items as QueuedNeed[]; }
async function saveQueue(items: QueuedNeed[]) { await AsyncStorage.setItem(QUEUE_KEY,JSON.stringify(items)); }
function withQueueOperation<T>(operation:()=>Promise<T>):Promise<T>{const result=queueOperationTail.then(operation,operation);queueOperationTail=result.then(()=>undefined,()=>undefined);return result;}

export async function queueNeedForSync(draft: NeedDraft) {
  const attachments:EvidenceAttachment[]=draft.attachments||draft.evidenceUris.map((uri,i)=>({id:`legacy-${i}`,uri,kind:/\.(mp4|mov)(\?|$)/i.test(uri)?'video':'photo'}));
  const invalid=validateMediaSelection(attachments.map(x=>({...x,durationSeconds:x.captureContext?.durationSeconds})));if(invalid)throw new Error(invalid);
  const coordinates=parseInterventionCoordinates(draft.latitude,draft.longitude);
  if(!coordinates||!draft.locationConfirmedAt)throw new Error('A confirmed intervention location is required before this report can sync.');
  return withQueueOperation(async()=>{const queue=await loadQueue();const key=draft.submissionKey||makeId('need');const existing=queue.find(item=>item.idempotencyKey===key);if(existing){const intent=(x:NeedDraft)=>JSON.stringify({title:x.title,description:x.description,category:x.category,categoryDetail:x.categoryDetail,latitude:x.latitude,longitude:x.longitude,evidenceUris:x.evidenceUris});if(intent(existing.draft)!==intent(draft))throw new Error('This draft is already queued. Review it in My submissions before creating a new observation.');return existing;}const stable={...draft,...coordinates,submissionKey:key};await saveNeedDraft(stable);const item:QueuedNeed={idempotencyKey:key,draft:stable,queuedAt:new Date().toISOString(),attempts:0,uploadedEvidenceUris:[]};await saveQueue([...queue,item]);return item;});
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
  return withQueueOperation(async()=>(await loadQueue()).filter(needsLocationReview).length);
}

export async function getNextNeedLocationReview() {
  return withQueueOperation(async()=>(await loadQueue()).find(needsLocationReview) ?? null);
}

export async function confirmQueuedNeedLocation(idempotencyKey: string, location: ConfirmedNeedLocation) {
  const coordinates=parseInterventionCoordinates(location.latitude,location.longitude);
  if(!coordinates||!location.locationConfirmedAt)throw new Error('Valid confirmed coordinates are required.');
  return withQueueOperation(async()=>{const queue=await loadQueue();const index=queue.findIndex(item=>item.idempotencyKey===idempotencyKey&&!item.serverNeedId);
    if(index<0)throw new Error('The pending observation is no longer available for location review.');
    const current=queue[index];const updated:QueuedNeed={...current,draft:{...current.draft,...location,...coordinates}};queue[index]=updated;await saveQueue(queue);return updated;});
}

export type SyncResult={synced:number;remaining:number;offline:boolean;syncedKeys:string[]};

export function flushNeedQueue():Promise<SyncResult>{return withQueueOperation(flushNeedQueueUnlocked)}

async function flushNeedQueueUnlocked():Promise<SyncResult>{
  const baseUrl=apiBaseUrl();const queue=await loadQueue();if(!baseUrl||queue.length===0)return{synced:0,remaining:queue.length,offline:!baseUrl,syncedKeys:[]};
  const token=await getAccessToken();const remaining:QueuedNeed[]=[];const syncedKeys:string[]=[];const completedFiles:string[]=[];let synced=0;
  for(const original of queue){let item={...original,uploadedEvidenceUris:[...(original.uploadedEvidenceUris??[])]};try{
      if(!item.serverNeedId){const coordinates=parseInterventionCoordinates(item.draft.latitude,item.draft.longitude);if(!coordinates||!item.draft.locationConfirmedAt){remaining.push(item);continue;}const response=await fetch(`${baseUrl}/v1/needs`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':item.idempotencyKey,...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({title:item.draft.title,description:item.draft.description,category:item.draft.category??'community',categoryDetail:item.draft.categoryDetail||'',locationContext:item.draft.locationSource?{source:item.draft.locationSource,capturedAt:item.draft.locationCapturedAt,accuracyMeters:item.draft.locationAccuracyMeters,confirmedAt:item.draft.locationConfirmedAt}:undefined,latitude:coordinates.latitude,longitude:coordinates.longitude,sdgTags:item.draft.sdgTags??[]})});if(!response.ok)throw new Error(`need sync ${response.status}`);const created=(await response.json()) as CreatedNeed;item.serverNeedId=created.id;}
      const pendingEvidence=item.draft.evidenceUris.filter((uri)=>!item.uploadedEvidenceUris?.includes(uri));
      if(pendingEvidence.length>0&&!token){remaining.push({...item,lastError:'Sign in to upload protected evidence.'});continue;}
      for(const uri of pendingEvidence){if(!token)break;await uploadEvidence(baseUrl,item.serverNeedId!,uri,token,`${item.idempotencyKey}-attachment-${item.draft.evidenceUris.indexOf(uri)}`,item.draft.attachments?.find(a=>a.uri===uri));item.uploadedEvidenceUris=[...(item.uploadedEvidenceUris??[]),uri];}
      const allEvidenceDone=item.draft.evidenceUris.every((uri)=>item.uploadedEvidenceUris?.includes(uri));if(allEvidenceDone){await recordSubmission(item);completedFiles.push(...item.draft.evidenceUris);synced+=1;syncedKeys.push(item.idempotencyKey)}else remaining.push(item);
    }catch(error){const text=error instanceof Error?error.message:'';const lastError=/401/.test(text)?'Sign in again to retry this submission.':/400/.test(text)?'Report or attachment details were rejected. Review the original and contact support before retrying.':/409/.test(text)?'This need has reached its attachment limit or the upload ID has conflicting data. Review your report before retrying.':/403/.test(text)?'Your account does not have permission for this action.':/local evidence/.test(text)?'An attachment cannot be read on this device. Keep the original and retry.':'The service or connection is unavailable. Your report is retained for retry.';remaining.push({...item,lastError,attempts:item.attempts+1});}}
  await saveQueue(remaining);
  // Delete only after the durable queue update; a failed cleanup never loses a queued file.
  try{const draft=await loadNeedDraft();const retained=new Set([...remaining.flatMap(item=>item.draft.evidenceUris),...(draft?.evidenceUris||[])]);await Promise.allSettled(completedFiles.filter(uri=>!retained.has(uri)).map(discardPrivateMedia));}catch{/* Keep originals when reference checks fail. */}
  return{synced,remaining:remaining.length,offline:false,syncedKeys};
}

async function uploadEvidence(baseUrl:string,needId:string,uri:string,token:string,clientAttachmentId:string,attachment?:EvidenceAttachment){
  const local=await fetch(uri);if(!local.ok)throw new Error('local evidence unavailable');const blob=await local.blob();const contentType=allowedType(blob.type)||allowedType(attachment?.contentType||'')||inferType(uri);if(!contentType)throw new Error('unsupported evidence type');
  const buffer=typeof blob.arrayBuffer==='function'?await blob.arrayBuffer():await new Promise<ArrayBuffer>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('local evidence unavailable'));reader.onload=()=>resolve(reader.result as ArrayBuffer);reader.readAsArrayBuffer(blob)});
  const digest=await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256,new Uint8Array(buffer));const sha256Hex=Array.from(new Uint8Array(digest)).map(value=>value.toString(16).padStart(2,'0')).join('');
  const initiate=await fetch(`${baseUrl}/v1/needs/${encodeURIComponent(needId)}/evidence/uploads`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({contentType,sizeBytes:blob.size,sha256Hex,clientAttachmentId,captureContext:attachment?.captureContext})});if(!initiate.ok)throw new Error(`evidence initiate ${initiate.status}`);const upload=(await initiate.json()) as InitiatedUpload;if(upload.completed)return;
  const put=await fetch(upload.uploadUrl,{method:'PUT',headers:{...upload.headers,'Content-Type':contentType},body:blob});if(!put.ok&&put.status!==412)throw new Error(`evidence upload ${put.status}`);
  const complete=await fetch(`${baseUrl}/v1/needs/${encodeURIComponent(needId)}/evidence/${encodeURIComponent(upload.evidenceId)}/complete`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});if(!complete.ok)throw new Error(`evidence complete ${complete.status}`);
}

function allowedType(value:string){const v=value.toLowerCase();return['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'].includes(v)?v:'';}
function inferType(uri:string){const path=uri.toLowerCase().split('?')[0];if(path.endsWith('.jpg')||path.endsWith('.jpeg'))return'image/jpeg';if(path.endsWith('.png'))return'image/png';if(path.endsWith('.webp'))return'image/webp';if(path.endsWith('.mp4'))return'video/mp4';if(path.endsWith('.mov'))return'video/quicktime';return'';}
export async function pendingNeedCount(){return withQueueOperation(async()=>(await loadQueue()).length);
}

export type SubmissionReceipt={idempotencyKey:string;title:string;needId:string;submittedAt:string};
async function recordSubmission(item:QueuedNeed){const previous=await getSubmissionHistory();if(previous.some(x=>x.idempotencyKey===item.idempotencyKey))return;await AsyncStorage.setItem(HISTORY_KEY,JSON.stringify([{idempotencyKey:item.idempotencyKey,title:item.draft.title,needId:item.serverNeedId!,submittedAt:new Date().toISOString()},...previous].slice(0,100)))}
export async function getSubmissionHistory():Promise<SubmissionReceipt[]>{const raw=await AsyncStorage.getItem(HISTORY_KEY);const items=raw?JSON.parse(raw):[];if(!Array.isArray(items))throw new Error('Submission history is unavailable.');return items}
export async function getPendingSubmissions(){return withQueueOperation(loadQueue)}
