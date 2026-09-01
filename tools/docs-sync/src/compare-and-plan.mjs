import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { validateScreenManifest } from './manifest-support.mjs';

const root=path.resolve(process.argv[2]||'.');
const manifest=JSON.parse(await readFile(path.join(root,'docs/documentation-system/screen-manifest.json'),'utf8'));
validateScreenManifest(manifest);
const fingerprint=JSON.parse(await readFile(path.join(root,'docs/documentation-system/ui-fingerprint.generated.json'),'utf8'));
const baselinePath=path.join(root,'docs/documentation-system/current-baseline.json');
const workingBaseline=JSON.parse(await readFile(baselinePath,'utf8'));
const configuredBaselinePath=process.env.DOCS_SYNC_BASELINE_PATH;
const acceptedBaselinePath=configuredBaselinePath
  ? (path.isAbsolute(configuredBaselinePath)?configuredBaselinePath:path.join(root,configuredBaselinePath))
  : baselinePath;
const baseline=acceptedBaselinePath===baselinePath
  ? workingBaseline
  : JSON.parse(await readFile(acceptedBaselinePath,'utf8'));
const runtimePath=path.join(root,'docs/documentation-system/runtime-capture.generated.json');
const sourceRevision=process.env.DOCS_SYNC_SOURCE_REVISION||process.env.GITHUB_SHA||fingerprint.sourceRevision||'local';
let runtime=null;
let runtimeAttempt=null;
try {
  await access(runtimePath);
  const candidate=JSON.parse(await readFile(runtimePath,'utf8'));
  if(candidate.sourceRevision===sourceRevision){
    runtime=candidate;
    runtimeAttempt=candidate;
  }else if(candidate.expectedSourceRevision===sourceRevision){
    runtimeAttempt=candidate;
  }
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

const currentSynchronizationContract=fingerprint.synchronizationContract||{};
const previousSynchronizationContract=baseline.synchronizationContract||{};
const allSynchronizationContractPaths=[...new Set([...Object.keys(currentSynchronizationContract),...Object.keys(previousSynchronizationContract)])].sort();
const synchronizationContractChanges=[];
for(const source of allSynchronizationContractPaths){
  const current=currentSynchronizationContract[source]??null;
  const previous=previousSynchronizationContract[source]??null;
  if(current!==previous){
    synchronizationContractChanges.push({source,previous,current,change:previous===null?'added':current===null?'deleted':'modified'});
  }
}

const previousScreenshots=baseline.screenshots||{};
const previousScreenshotPaths=baseline.screenshotPaths||{};
const priorScreenshotRevision=baseline.screenshotSourceRevision
  || (Object.keys(previousScreenshots).length?baseline.sourceRevision:null);
const manifestScreens=new Map(manifest.screens.map(screen=>[screen.id,screen]));
const screenshotState={};
const screenshotPaths={};
let screenshotSourceRevision=runtime?sourceRevision:runtimeAttempt?null:priorScreenshotRevision;
const screenshotEvidence={};
const screenshotChanges=[];
for(const [id,previous] of Object.entries(previousScreenshots)){
  const currentScreen=manifestScreens.get(id);
  const previousPath=previousScreenshotPaths[id]||currentScreen?.screenshot;
  if(!currentScreen){
    if(!previousPath) throw new Error(`Cannot prune screenshot ${id}: its accepted baseline path is missing.`);
    screenshotChanges.push({id,screenshot:previousPath,previous,current:null,reason:'removed-screen-registration'});
  }else if(previousPath!==currentScreen.screenshot){
    screenshotChanges.push({id,screenshot:previousPath,previous,current:null,reason:'moved-screen-screenshot'});
  }else if(!runtimeAttempt){
    screenshotState[id]=previous;
    screenshotPaths[id]=currentScreen.screenshot;
  }
}
const runtimeResults=new Map((runtime?.results||[]).map(result=>[result.id,result]));
for(const screen of manifest.screens){
  const p=path.join(root,screen.screenshot);
  const previousPath=previousScreenshotPaths[screen.id]||screen.screenshot;
  const prior=previousPath===screen.screenshot?(previousScreenshots[screen.id]||null):null;
  let current=null;
  try{
    const bytes=await readFile(p);
    current=createHash('sha256').update(bytes).digest('hex');
  }catch{}
  if(runtime){
    const result=runtimeResults.get(screen.id);
    if(result?.status==='captured'&&current&&result.sha256===current){
      screenshotState[screen.id]=current;
      screenshotPaths[screen.id]=screen.screenshot;
      screenshotEvidence[screen.id]={status:'current',sourceRevision,screenshot:screen.screenshot,sha256:current};
      if(prior!==current) screenshotChanges.push({id:screen.id,screenshot:screen.screenshot,previous:prior,current,reason:prior?'updated-runtime-image':'new-runtime-image'});
    }else{
      delete screenshotState[screen.id];
      delete screenshotPaths[screen.id];
      if(prior||current) screenshotChanges.push({id:screen.id,screenshot:screen.screenshot,previous:prior,current:null,observed:current,reason:result?.status==='captured'?'runtime-digest-mismatch':'missing-current-image'});
    }
  }else if(runtimeAttempt){
    delete screenshotState[screen.id];
    delete screenshotPaths[screen.id];
    if(prior||current) screenshotChanges.push({id:screen.id,screenshot:screen.screenshot,previous:prior,current:null,observed:current,reason:'runtime-capture-unverified'});
  }else if(prior&&current===prior){
    screenshotEvidence[screen.id]={status:'predecessor',sourceRevision:priorScreenshotRevision,screenshot:screen.screenshot,sha256:prior};
  }else if(current){
    delete screenshotState[screen.id];
    delete screenshotPaths[screen.id];
    screenshotChanges.push({id:screen.id,screenshot:screen.screenshot,previous:prior,current:null,observed:current,reason:'unverified-image-change'});
  }else if(prior){
    delete screenshotState[screen.id];
    delete screenshotPaths[screen.id];
    screenshotChanges.push({id:screen.id,screenshot:screen.screenshot,previous:prior,current:null,reason:'missing-current-image'});
  }
}
if(!Object.keys(screenshotState).length) screenshotSourceRevision=null;

const runtimeFailures=((runtime||runtimeAttempt)?.results||[]).filter(result=>result.status==='failed'||result.anchorMatched===false);
const changedScreens=[...new Set([...sourceChanges.map(change=>change.id),...screenshotChanges.map(change=>change.id),...runtimeFailures.map(result=>result.id).filter(Boolean)])];
const hasChanges=frontendSourceChanges.length>0||synchronizationContractChanges.length>0||screenshotChanges.length>0||runtimeFailures.length>0;
const report={
  schema:'irespond.documentation-ui-change-report.v2',
  sourceRevision,
  baselineRevision:baseline.sourceRevision,
  runtimeCaptureAvailable:!!runtime,
  runtimeCaptureAttempted:!!runtimeAttempt,
  screenshotSourceRevision,
  screenshotEvidence,
  changed:changedScreens,
  frontendSourceChanges,
  synchronizationContractChanges,
  sourceChanges,
  unmappedFrontendChanges,
  screenshotChanges,
  runtimeFailures,
  action:hasChanges?'regenerate-manual-interface-sections':'none'
};
await mkdir(path.join(root,'docs/documentation-system'),{recursive:true});
await writeFile(path.join(root,'docs/documentation-system/ui-change-report.generated.json'),`${JSON.stringify(report,null,2)}\n`);

// Baseline advancement is opt-in and happens only on the dedicated docs-sync
// branch after a relevant change lands on main. Replacing accepted maps rather
// than merging them ensures deleted inputs cannot linger in the baseline.
if(process.env.DOCS_SYNC_UPDATE_BASELINE==='1'){
  const baselineSeed=baseline.bootstrap===true
    ? {
        schema:baseline.schema,
        interfaceMode:workingBaseline.interfaceMode,
        trackedFrontendRoots:fingerprint.trackedFrontendRoots||manifest.trackedFrontendRoots||[],
        publications:workingBaseline.publications||[],
      }
    : baseline;
  const next={...baselineSeed,sourceRevision:report.sourceRevision,capturedAt:process.env.DOCS_SYNC_CAPTURED_AT||new Date().toISOString(),sources:currentSources,synchronizationContract:currentSynchronizationContract,screenshotSourceRevision,screenshots:screenshotState,screenshotPaths};
  delete next.bootstrap;
  await writeFile(baselinePath,`${JSON.stringify(next,null,2)}\n`);
}
if(process.env.GITHUB_OUTPUT){
  await writeFile(process.env.GITHUB_OUTPUT,`changed=${hasChanges?'true':'false'}\nchanged_count=${changedScreens.length}\nfrontend_change_count=${frontendSourceChanges.length}\ncontract_change_count=${synchronizationContractChanges.length}\nunmapped_change_count=${unmappedFrontendChanges.length}\n`,{flag:'a'});
}
console.log(JSON.stringify(report));
