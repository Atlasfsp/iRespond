import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
const source=stripTypeScriptTypes(await readFile('apps/mobile/lib/environment.ts','utf8'));
for(const [demo,configured,expected] of [[true,'https://live.example.test','https://demo.irespond.local'],[false,'https://live.example.test/','https://live.example.test'],[false,undefined,'']]){
 const context=vm.createContext({process:{env:{EXPO_PUBLIC_API_BASE_URL:configured}}});
 const backend=new vm.SyntheticModule(['demoMode','DEMO_API_BASE_URL'],function(){this.setExport('demoMode',demo);this.setExport('DEMO_API_BASE_URL','https://demo.irespond.local')},{context});
 const module=new vm.SourceTextModule(source,{context});await module.link(name=>{assert.equal(name,'./demo-backend');return backend});await module.evaluate();assert.equal(module.namespace.apiBaseUrl(),expected);
}
console.log('Demo builds ignore live API configuration; connected builds never infer a demo backend.');
