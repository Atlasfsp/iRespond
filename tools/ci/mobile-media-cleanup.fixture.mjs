import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
const source=stripTypeScriptTypes(await readFile('apps/mobile/lib/media.ts','utf8'));
for(const platform of ['android','web']){
 const deleted=[];const context=vm.createContext({});const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v)},{context});
 const fs=synthetic({documentDirectory:'file:///private/app/',deleteAsync:async(uri,options)=>deleted.push({uri,...options})});
 const module=new vm.SourceTextModule(source,{context});await module.link(name=>name==='expo-file-system'?fs:synthetic({Platform:{OS:platform}}));await module.evaluate();
 const owned='file:///private/app/report-evidence/attachment-123-abc123.jpg';
 for(const uri of [owned,'file:///picker/original.jpg','file:///private/app/report-evidence/../secrets','file:///private/app/report-evidence/%2e%2e%2fsecrets','file:///other/app/report-evidence/attachment-123-abc123.jpg','file:///private/app/report-evidence/not-owned.jpg'])await module.namespace.discardPrivateMedia(uri);
 assert.deepEqual(deleted,platform==='android'?[{uri:owned,idempotent:true}]:[]);
}
console.log('Cleanup allowlist preserves picker originals, other files, traversal paths and web attachments.');
