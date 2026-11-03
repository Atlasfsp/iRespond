import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {webcrypto,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {validateMediaSelection} from '../../apps/web/field-report-policy.mjs';
const source=stripTypeScriptTypes(await readFile(process.env.MOBILE_SYNC_SOURCE||'apps/mobile/lib/sync.ts','utf8'));
const coordinates=stripTypeScriptTypes(await readFile('apps/mobile/lib/coordinates.ts','utf8'));
const bytes=Buffer.from('synthetic JPEG fixture, no field evidence');const uri=`data:image/jpeg;base64,${bytes.toString('base64')}`;
const captureContext={origin:'library',recordedAt:'2026-11-03T00:00:00Z',stage:'before',locationStatus:'unavailable'};
for(const scenario of ['put-already-stored','transport-already-complete','quota-exceeded','mime-fallback']){
 const storage=new Map(),requests=[];const selectedContext=scenario==='mime-fallback'?{...captureContext,durationSeconds:30}:captureContext;
 const item={idempotencyKey:'synthetic-upload-retry',attempts:0,queuedAt:'2026-11-03T00:00:00Z',serverNeedId:'synthetic-need',draft:{title:'Synthetic upload',description:'Not a real intervention',latitude:0,longitude:0,locationConfirmedAt:'2026-11-03T00:00:00Z',evidenceUris:[uri],attachments:[{id:'photo-1',uri,kind:scenario==='mime-fallback'?'video':'photo',contentType:scenario==='mime-fallback'?'video/quicktime':undefined,captureContext:selectedContext}],updatedAt:'2026-11-03T00:00:00Z'}};
 storage.set('irespond.sync-queue.v1',JSON.stringify([item]));
 const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 const mockFetch=async(url,init={})=>{if(url===uri)return scenario==='mime-fallback'?new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}}):fetch(uri);requests.push({url,...init});
  if(url.endsWith('/evidence/uploads'))return scenario==='quota-exceeded'?respond({error:'budget exceeded'},409):respond({evidenceId:'synthetic-evidence',uploadUrl:'https://storage.example.test/upload',headers:{},completed:scenario==='transport-already-complete'});
  if(url==='https://storage.example.test/upload')return respond({},412);
  if(url.endsWith('/complete'))return respond({status:'pending_review'});
  throw new Error('Unexpected network target: '+url);
 };
 const context=vm.createContext({process:{env:{EXPO_PUBLIC_API_BASE_URL:'https://api.example.test'}},fetch:mockFetch,Uint8Array,ArrayBuffer});
 const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v)},{context});
 const modules={
  'expo-crypto':synthetic({CryptoDigestAlgorithm:{SHA256:'SHA-256'},digest:(algorithm,data)=>webcrypto.subtle.digest(algorithm,data)}),
  '@react-native-async-storage/async-storage':synthetic({default:{getItem:async key=>storage.get(key)||null,setItem:async(key,value)=>storage.set(key,value)}}),
  './environment':synthetic({apiBaseUrl:()=> 'https://api.example.test'}),
  './media':synthetic({discardPrivateMedia:async()=>{}}),
  './drafts':synthetic({loadNeedDraft:async()=>{const raw=storage.get('irespond.need-draft.v1');return raw?JSON.parse(raw):null},saveNeedDraft:async draft=>storage.set('irespond.need-draft.v1',JSON.stringify(draft))}),
  '../../web/field-report-policy.mjs':synthetic({validateMediaSelection}),
  './coordinates':new vm.SourceTextModule(coordinates,{context}),
  './device-store':synthetic({getDeviceItem:async key=>storage.get(key)||null,setDeviceItem:async(key,value)=>storage.set(key,value)}),
  './session':synthetic({getAccessToken:async()=> 'synthetic-session-token'}),
 };
 const module=new vm.SourceTextModule(source,{context});await module.link(name=>{if(!modules[name])throw Error('Unexpected dependency '+name);return modules[name]});await module.evaluate();const result=await module.namespace.flushNeedQueue();
 if(scenario==='quota-exceeded'){assert.equal(result.synced,0);const retained=JSON.parse(storage.get('irespond.sync-queue.v1'));assert.equal(retained[0].draft.evidenceUris[0],uri);assert.match(retained[0].lastError,/attachment limit/);continue}
 assert.equal(result.synced,1,scenario);assert.equal(JSON.parse(storage.get('irespond.sync-queue.v1')).length,0);
 const intent=JSON.parse(requests[0].body);assert.equal(intent.sha256Hex,createHash('sha256').update(bytes).digest('hex'));assert.equal(intent.clientAttachmentId,'synthetic-upload-retry-attachment-0');assert.deepEqual(intent.captureContext,selectedContext);assert.equal(intent.contentType,scenario==='mime-fallback'?'video/quicktime':'image/jpeg');
 assert.equal(requests.filter(r=>r.url==='https://storage.example.test/upload').length,scenario==='transport-already-complete'?0:1);
 assert.equal(requests.filter(r=>r.url.endsWith('/complete')).length,scenario==='transport-already-complete'?0:1);
}
console.log('Synthetic upload retry scenarios: digest/intent binding, lost PUT response, completed transport and quota retention passed.');
