import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const manifest=JSON.parse(await readFile(path.join(root,'docs/documentation-system/screen-manifest.json'),'utf8'));
const fingerprint=JSON.parse(await readFile(path.join(root,'docs/documentation-system/ui-fingerprint.generated.json'),'utf8'));
const baselinePath=path.join(root,'docs/documentation-system/current-baseline.json');
const baseline=JSON.parse(await readFile(baselinePath,'utf8'));
const runtimePath=path.join(root,'docs/documentation-system/runtime-capture.generated.json');
let runtime=null;
try { await access(runtimePath); runtime=JSON.parse(await readFile(runtimePath,'utf8')); } catch {}

const sourceChanges=[];
for(const screen of manifest.screens){
  const current=fingerprint.sources[screen.source];
  const previous=baseline.sources?.[screen.source];
  if(current && current!==previous) sourceChanges.push({id:screen.id,source:screen.source,previous,current});
}

const screenshotChanges=[];
for(const screen of manifest.screens){
  const p=path.join(root,screen.screenshot);
  try{
    const bytes=await readFile(p);
    const current=createHash('sha256').update(bytes).digest('hex');
    const prior=baseline.screenshots?.[screen.id];
    if(prior && prior!==current) screenshotChanges.push({id:screen.id,screenshot:screen.screenshot,previous:prior,current});
    if(!prior) screenshotChanges.push({id:screen.id,screenshot:screen.screenshot,previous:null,current,reason:'new-baseline-image'});
  }catch{}
}
const changed=[...new Set([...sourceChanges.map(x=>x.id),...screenshotChanges.map(x=>x.id)])];
const report={
  schema:'irespond.documentation-ui-change-report.v1',
  sourceRevision:process.env.GITHUB_SHA||'local',
  baselineRevision:baseline.sourceRevision,
  runtimeCaptureAvailable:!!runtime,
  changed,
  sourceChanges,
  screenshotChanges,
  action:changed.length?'regenerate-manual-interface-sections':'none'
};
await mkdir(path.join(root,'docs/documentation-system'),{recursive:true});
await writeFile(path.join(root,'docs/documentation-system/ui-change-report.generated.json'),`${JSON.stringify(report,null,2)}\n`);
if(process.env.GITHUB_OUTPUT){
  await writeFile(process.env.GITHUB_OUTPUT,`changed=${changed.length?'true':'false'}\nchanged_count=${changed.length}\n`,{flag:'a'});
}
console.log(JSON.stringify(report));
