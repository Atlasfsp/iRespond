import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const manifest=JSON.parse(await readFile(path.join(root,'docs/documentation-system/screen-manifest.json'),'utf8'));
const fingerprint=JSON.parse(await readFile(path.join(root,'docs/documentation-system/ui-fingerprint.generated.json'),'utf8'));
const baselinePath=path.join(root,'docs/documentation-system/current-baseline.json');
const baseline=JSON.parse(await readFile(baselinePath,'utf8'));
const runtimePath=path.join(root,'docs/documentation-system/runtime-capture.generated.json');
const sourceRevision=process.env.GITHUB_SHA||fingerprint.sourceRevision||'local';
let runtime=null;
try {
  await access(runtimePath);
  const candidate=JSON.parse(await readFile(runtimePath,'utf8'));
  if(candidate.sourceRevision===sourceRevision) runtime=candidate;
} catch {}

const mappedSources=new Map();
for(const screen of manifest.screens){
  const ids=mappedSources.get(screen.source)||[];
  ids.push(screen.id);
  mappedSources.set(screen.source,ids);
}

const currentSources=fingerprint.sources||{};
const previousSources=baseline.sources||{};
const allSourcePaths=[...new Set([...Object.keys(currentSources),...Object.keys(previousSources)])].sort();
const frontendSourceChanges=[];
for(const source of allSourcePaths){
  const current=currentSources[source]??null;
  const previous=previousSources[source]??null;
  if(current!==previous){
    frontendSourceChanges.push({source,previous,current,change:previous===null?'added':current===null?'deleted':'modified',screens:mappedSources.get(source)||[]});
  }
}
const sourceChanges=frontendSourceChanges.filter(change=>change.screens.length>0).flatMap(change=>change.screens.map(id=>({id,source:change.source,previous:change.previous,current:change.current,change:change.change})));
const unmappedFrontendChanges=frontendSourceChanges.filter(change=>change.screens.length===0);

const screenshotState={...(baseline.screenshots||{})};
const screenshotChanges=[];
for(const screen of manifest.screens){
  const p=path.join(root,screen.screenshot);
  try{
    const bytes=await readFile(p);
    const current=createHash('sha256').update(bytes).digest('hex');
    const prior=baseline.screenshots?.[screen.id];
    screenshotState[screen.id]=current;
    if(prior && prior!==current) screenshotChanges.push({id:screen.id,screenshot:screen.screenshot,previous:prior,current});
    if(!prior) screenshotChanges.push({id:screen.id,screenshot:screen.screenshot,previous:null,current,reason:'new-baseline-image'});
  }catch{}
}

const runtimeFailures=(runtime?.results||[]).filter(result=>result.status==='failed'||result.anchorMatched===false);
const changedScreens=[...new Set([...sourceChanges.map(change=>change.id),...screenshotChanges.map(change=>change.id),...runtimeFailures.map(result=>result.id).filter(Boolean)])];
const hasChanges=frontendSourceChanges.length>0||screenshotChanges.length>0||runtimeFailures.length>0;
const report={
  schema:'irespond.documentation-ui-change-report.v2',
  sourceRevision,
  baselineRevision:baseline.sourceRevision,
  runtimeCaptureAvailable:!!runtime,
  changed:changedScreens,
  frontendSourceChanges,
  sourceChanges,
  unmappedFrontendChanges,
  screenshotChanges,
  runtimeFailures,
  action:hasChanges?'regenerate-manual-interface-sections':'none'
};
await mkdir(path.join(root,'docs/documentation-system'),{recursive:true});
await writeFile(path.join(root,'docs/documentation-system/ui-change-report.generated.json'),`${JSON.stringify(report,null,2)}\n`);

// Baseline advancement is opt-in and happens only on the dedicated docs-sync
// branch after a frontend change lands on main. Replacing the source map rather
// than merging it ensures deleted frontend files cannot linger as accepted UI.
if(process.env.DOCS_SYNC_UPDATE_BASELINE==='1'){
  const next={...baseline,sourceRevision:report.sourceRevision,capturedAt:new Date().toISOString(),sources:currentSources,screenshots:screenshotState};
  await writeFile(baselinePath,`${JSON.stringify(next,null,2)}\n`);
}
if(process.env.GITHUB_OUTPUT){
  await writeFile(process.env.GITHUB_OUTPUT,`changed=${hasChanges?'true':'false'}\nchanged_count=${changedScreens.length}\nfrontend_change_count=${frontendSourceChanges.length}\nunmapped_change_count=${unmappedFrontendChanges.length}\n`,{flag:'a'});
}
console.log(JSON.stringify(report));
