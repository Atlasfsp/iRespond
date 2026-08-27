import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const graph=JSON.parse(await readFile('docs/frontend/navigation-graph.json','utf8'));
const apiMap=JSON.parse(await readFile('docs/frontend/frontend-api-map.json','utf8'));
const catalogTs=await readFile('apps/mobile/lib/stitch-screen-catalog.ts','utf8');
const webCatalogManifest=JSON.parse(await readFile('apps/web/stitch-screen-catalog.json','utf8'));
const chrome=await readFile('apps/mobile/components/StitchChrome.tsx','utf8');
const notifications=await readFile('apps/mobile/app/notifications.tsx','utf8');
const project=await readFile('apps/mobile/app/project/[id].tsx','utf8');
const webApp=await readFile('apps/web/app.js','utf8');
const webCatalog=await readFile('apps/web/stitch-catalog.js','utf8');
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

const mappedWebRoutes=new Set();
for(const[item,contract]of Object.entries(apiMap.operations||{})){
 for(const route of contract.mobileRoutes||[])if(!declared.has(stripQuery(route)))failures.push(`${item}: mapped mobile route ${route} is not in the reachability graph`);
 for(const route of contract.webRoutes||[])mappedWebRoutes.add(stripWebQuery(route));
}

for(const match of catalogTs.matchAll(/mobileRoute:\s*['"]([^'"]+)['"]/g)){
 const route=stripQuery(match[1]);
 if(!declared.has(route))failures.push(`Stitch live route ${match[1]} is not represented in navigation graph`);
}

for(const route of liveWebRoutes(webCatalogManifest))mappedWebRoutes.add(stripWebQuery(route));

// The web application uses one hash router. Every hash route referenced by the
// API ownership map or live Stitch catalog must have a render target and an
// inbound navigation entry. Role-restricted entries can be conditional, but
// they must still be present in renderChrome and server authorization remains
// authoritative after navigation.
for(const route of [...mappedWebRoutes].sort()){
 if(!route.startsWith('#')){failures.push(`web route ${route}: expected a hash route`);continue;}
 const id=route.slice(1);
 if(!id){failures.push(`web route ${route}: empty route id`);continue;}
 const rendered=id==='home'
   ? /default\s*:\s*await\s+renderHome\(\)/.test(webApp)
   : new RegExp(`case['"]${escapeRegExp(id)}['"]\\s*:\\s*await\\s+render[A-Za-z0-9_]+\\(`).test(webApp);
 if(!rendered)failures.push(`${route}: no web router render target`);
 const navigable=hasWebNavEntry(webApp,id)||webCatalog.includes(`href=\"\${catEsc(screen.webRoute)}\"`);
 if(!navigable)failures.push(`${route}: no browser navigation/catalog entry`);
}

if(!webCatalog.includes("button.textContent='Surfaces'"))failures.push('web canonical chrome must expose the Stitch surface launcher');
if(!webCatalog.includes('screen.webRoute'))failures.push('web Stitch catalog must open live screen webRoute targets');
if(!chrome.includes("router.push('/catalog')"))failures.push('universal mobile chrome must link to /catalog');
if(!chrome.includes("router.push('/notifications')"))failures.push('universal mobile chrome must link to /notifications');
if(!/pathname:\s*['"]\/project-admin['"][\s\S]{0,160}projectId/.test(project))failures.push('Project Room must carry projectId into /project-admin');
for(const token of ['resourceType','/role-invite','/project/','/need/','/contributions','/pledges','/safety','/privacy','/workspace'])if(!notifications.includes(token))failures.push(`notification deep-link router is missing ${token}`);

if(failures.length){console.error('Frontend reachability FAILED');for(const failure of failures)console.error(`- ${failure}`);process.exit(1)}
console.log(`Frontend reachability verified: ${actual.size} Expo routes plus ${mappedWebRoutes.size} canonical web hash routes have resolvable render/navigation contracts.`);

async function expoRoutes(root){const out=[];await walk(root,'',out);return out.sort()}
async function walk(dir,relative,out){for(const entry of await readdir(dir,{withFileTypes:true})){const nextRelative=relative?`${relative}/${entry.name}`:entry.name;const full=path.join(dir,entry.name);if(entry.isDirectory())await walk(full,nextRelative,out);else if(entry.name.endsWith('.tsx')&&entry.name!=='_layout.tsx')out.push(fileToRoute(nextRelative))}}
function fileToRoute(file){let value=file.replace(/\.tsx$/,'');if(value==='index')return'/';if(value.endsWith('/index'))value=value.slice(0,-6);return`/${value}`}
function stripQuery(route){return String(route).split('?')[0]}
function stripWebQuery(route){const value=String(route);const [hash,query='']=value.split('?');return query?hash:hash}
function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function hasWebNavEntry(source,id){
 const token=`['${id}'`;
 const tokenDouble=`[\"${id}\"`;
 return source.includes(token)||source.includes(tokenDouble);
}
function liveWebRoutes(manifest){
 const routes=[];
 for(const value of Object.values(manifest.liveSuppliedScreens||{}))if(value&&typeof value==='object'&&value.webRoute)routes.push(value.webRoute);
 for(const screen of manifest.extendedScreens||[])if(screen.webRoute)routes.push(screen.webRoute);
 return routes;
}
