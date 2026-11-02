import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
const source=stripTypeScriptTypes(await readFile('apps/mobile/lib/sync.ts','utf8'));
const coordinates=stripTypeScriptTypes(await readFile('apps/mobile/lib/coordinates.ts','utf8'));
for(const token of ['verified-test-token',null]) {
 const storage=new Map();const requests=[];
 storage.set('irespond.sync-queue.v1',JSON.stringify([{idempotencyKey:'synthetic-retry-key',attempts:0,queuedAt:'2026-11-02T00:00:00Z',draft:{title:'Synthetic observation',description:'No pilot evidence',latitude:6.5,longitude:3.4,locationConfirmedAt:'2026-11-02T00:00:00Z',evidenceUris:[]}}]));
 const context=vm.createContext({process:{env:{EXPO_PUBLIC_API_BASE_URL:'https://api.example.test'}},fetch:async(url,options)=>{requests.push({url,...options});return {ok:true,json:async()=>({id:'synthetic-need'})}}});
 const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v)},{context});
 const modules={
  '@react-native-async-storage/async-storage':synthetic({default:{getItem:async key=>storage.get(key)||null,setItem:async(key,value)=>storage.set(key,value)}}),
  './coordinates':new vm.SourceTextModule(coordinates,{context}),
  './device-store':synthetic({getDeviceItem:async key=>storage.get(key)||null,setDeviceItem:async(key,value)=>storage.set(key,value)}),
  './session':synthetic({getAccessToken:async()=>token}),
 };
 const module=new vm.SourceTextModule(source,{context});
 await module.link(name=>{if(!modules[name])throw Error('Unexpected dependency '+name);return modules[name]});await module.evaluate();
 const result=await module.namespace.flushNeedQueue();assert.equal(result.synced,1);assert.equal(requests.length,1);
 assert.equal(requests[0].headers.Authorization,token?`Bearer ${token}`:undefined,'Need attribution must use the session bearer token');
 assert.equal(JSON.parse(requests[0].body).reporterId,undefined,'Do not claim a locally generated actor ID as verified reporter identity');
}
console.log('Mobile sync preserves optional verified identity without client-supplied attribution.');
