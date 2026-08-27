import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const graph=JSON.parse(await readFile('docs/frontend/navigation-graph.json','utf8'));
const apiMap=JSON.parse(await readFile('docs/frontend/frontend-api-map.json','utf8'));
const catalogTs=await readFile('apps/mobile/lib/stitch-screen-catalog.ts','utf8');
const chrome=await readFile('apps/mobile/components/StitchChrome.tsx','utf8');
const notifications=await readFile('apps/mobile/app/notifications.tsx','utf8');
const project=await readFile('apps/mobile/app/project/[id].tsx','utf8');
const actual=new Set(await expoRoutes('apps/mobile/app'));
const declared=new Set(Object.keys(graph.routes||{}));
const failures=[];

for(const route of actual)if(!declared.has(route))failures.push(`${route}: Expo route is not declared in navigation graph`);
for(const route of declared)if(!actual.has(route))failures.push(`${route}: navigation graph points to a missing Expo route`);

const special=new Set(['app-launch','universal-topbar','bottom-nav','protected-route-redirect','return-route','live-screen-route']);
for(const[route,node]of Object.entries(graph.routes||{})){
 if(route!==graph.root&&(!Array.isArray(node.inbound)||node.inbound.length===0))failures.push(`${route}: no inbound navigation edge`);
 if(!Array.isArray(node.exits)||node.exits.length===0)failures.push(`${route}: no exit navigation edge`);
 for(const source of node.inbound||[])if(!declared.has(source)&&!special.has(source))failures.push(`${route}: inbound source ${source} is neither a route nor a supported universal entry`);
 for(const target of node.exits||[])if(!declared.has(target)&&!special.has(target))failures.push(`${route}: exit ${target} is neither a route nor a supported dynamic/universal target`);
}

for(const entry of graph.universalEntries||[])if(!declared.has(entry))failures.push(`universal entry ${entry}: route is missing`);

for(const[item,contract]of Object.entries(apiMap.operations||{})){
 for(const route of contract.mobileRoutes||[])if(!declared.has(stripQuery(route)))failures.push(`${item}: mapped mobile route ${route} is not in the reachability graph`);
}

for(const match of catalogTs.matchAll(/mobileRoute:\s*['"]([^'"]+)['"]/g)){
 const route=stripQuery(match[1]);
 if(!declared.has(route))failures.push(`Stitch live route ${match[1]} is not represented in navigation graph`);
}

if(!chrome.includes("router.push('/catalog')"))failures.push('universal mobile chrome must link to /catalog');
if(!chrome.includes("router.push('/notifications')"))failures.push('universal mobile chrome must link to /notifications');
if(!/pathname:\s*['"]\/project-admin['"][\s\S]{0,160}projectId/.test(project))failures.push('Project Room must carry projectId into /project-admin');
for(const token of ['resourceType','/role-invite','/project/','/need/','/contributions','/pledges','/safety','/privacy','/workspace'])if(!notifications.includes(token))failures.push(`notification deep-link router is missing ${token}`);

if(failures.length){console.error('Frontend reachability FAILED');for(const failure of failures)console.error(`- ${failure}`);process.exit(1)}
console.log(`Frontend reachability verified: ${actual.size} Expo routes have inbound/outbound navigation contracts and all mapped/live routes resolve.`);

async function expoRoutes(root){const out=[];await walk(root,'',out);return out.sort()}
async function walk(dir,relative,out){for(const entry of await readdir(dir,{withFileTypes:true})){const nextRelative=relative?`${relative}/${entry.name}`:entry.name;const full=path.join(dir,entry.name);if(entry.isDirectory())await walk(full,nextRelative,out);else if(entry.name.endsWith('.tsx')&&entry.name!=='_layout.tsx')out.push(fileToRoute(nextRelative))}}
function fileToRoute(file){let value=file.replace(/\.tsx$/,'');if(value==='index')return'/';if(value.endsWith('/index'))value=value.slice(0,-6);return`/${value}`}
function stripQuery(route){return String(route).split('?')[0]}
