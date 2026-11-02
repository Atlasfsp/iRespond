import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const result=spawnSync('pnpm',['exec','expo-modules-autolinking','resolve','--platform','android','--json'],{cwd:'apps/mobile',encoding:'utf8'});
assert.equal(result.status,0,result.stderr||result.stdout);
const manifest=JSON.parse(result.stdout);
const names=new Set(manifest.modules.map(module=>module.packageName));
for(const name of ['expo-crypto','expo-web-browser','expo-secure-store','expo-image-picker','expo-location']){
 assert.ok(names.has(name),`Native build omits ${name}; JavaScript exports alone cannot verify autolinking`);
}
const crypto=manifest.modules.find(module=>module.packageName==='expo-crypto');
assert.ok(crypto.projects.some(project=>project.modules?.includes('expo.modules.crypto.CryptoModule')),'ExpoCrypto native class must be registered');
mkdirSync('build/evidence/mobile',{recursive:true});
writeFileSync('build/evidence/mobile/autolinking.json',JSON.stringify({sourceRevision:process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),platform:'android',modules:manifest.modules},null,2)+'\n');
console.log('Native autolinking verified: crypto, browser, secure storage, media and location');
