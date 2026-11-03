import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
import {validateMediaSelection} from '../../apps/web/field-report-policy.mjs';
const source=stripTypeScriptTypes(await readFile('apps/mobile/lib/sync.ts','utf8'));
const coordinates=stripTypeScriptTypes(await readFile('apps/mobile/lib/coordinates.ts','utf8'));
for(const token of ['verified-test-token',null]) {
 const storage=new Map();const requests=[];
 storage.set('irespond.sync-queue.v1',JSON.stringify([{idempotencyKey:'synthetic-retry-key',attempts:0,queuedAt:'2026-11-02T00:00:00Z',draft:{title:'Synthetic observation',description:'No pilot evidence',latitude:6.5,longitude:3.4,locationConfirmedAt:'2026-11-02T00:00:00Z',evidenceUris:[]}}]));
 const context=vm.createContext({process:{env:{EXPO_PUBLIC_API_BASE_URL:'https://api.example.test'}},fetch:async(url,options)=>{requests.push({url,...options});return {ok:true,json:async()=>({id:'synthetic-need'})}}});
 const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v)},{context});
 const modules={
  'expo-crypto':synthetic({CryptoDigestAlgorithm:{SHA256:'SHA-256'},digest:(algorithm,data)=>webcrypto.subtle.digest(algorithm,data)}),
  '@react-native-async-storage/async-storage':synthetic({default:{getItem:async key=>storage.get(key)||null,setItem:async(key,value)=>storage.set(key,value)}}),
  './coordinates':new vm.SourceTextModule(coordinates,{context}),
  './device-store':synthetic({getDeviceItem:async key=>storage.get(key)||null,setDeviceItem:async(key,value)=>storage.set(key,value)}),
  './environment':synthetic({apiBaseUrl:()=> 'https://api.example.test'}),
  './media':synthetic({discardPrivateMedia:async()=>{}}),
  './drafts':synthetic({loadNeedDraft:async()=>{const raw=storage.get('irespond.need-draft.v1');return raw?JSON.parse(raw):null},saveNeedDraft:async draft=>storage.set('irespond.need-draft.v1',JSON.stringify(draft))}),
  '../../web/field-report-policy.mjs':synthetic({validateMediaSelection}),
  './session':synthetic({getAccessToken:async()=>token}),
 };
 const module=new vm.SourceTextModule(source,{context});
 await module.link(name=>{if(!modules[name])throw Error('Unexpected dependency '+name);return modules[name]});await module.evaluate();
 const result=await module.namespace.flushNeedQueue();assert.equal(result.synced,1);assert.equal(requests.length,1);
 assert.equal(requests[0].headers.Authorization,token?`Bearer ${token}`:undefined,'Need attribution must use the session bearer token');
 assert.equal(JSON.parse(requests[0].body).reporterId,undefined,'Do not claim a locally generated actor ID as verified reporter identity');
 const draft={title:'Synthetic retry',description:'Not pilot evidence',category:'other',categoryDetail:'Wildlife rescue',latitude:0,longitude:0,locationSource:'manual',locationConfirmedAt:'2026-11-03T00:00:00Z',evidenceUris:[],updatedAt:'2026-11-03T00:00:00Z'};
 const queued=await module.namespace.queueNeedForSync(draft);
 const restored=JSON.parse(storage.get('irespond.need-draft.v1'));
 assert.equal(restored.submissionKey,queued.idempotencyKey);
 await module.namespace.queueNeedForSync(restored);
 assert.equal(JSON.parse(storage.get('irespond.sync-queue.v1')).length,1,'Retrying draft cleanup must not enqueue a duplicate observation');
 await assert.rejects(()=>module.namespace.queueNeedForSync({...restored,title:'Changed intent'}),/already queued/);
 await module.namespace.flushNeedQueue();
 const sent=JSON.parse(requests[1].body);assert.equal(sent.categoryDetail,'Wildlife rescue');assert.equal(sent.locationContext.source,'manual');assert.equal(sent.latitude,0);
 assert.equal(JSON.parse(storage.get('irespond.submissions.v1')).length,2,'Successful submissions retain only device receipts');

}
console.log('Mobile sync preserves optional verified identity without client-supplied attribution.');
