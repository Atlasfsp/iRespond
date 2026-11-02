import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html,web,css,mobile,map,chrome] = await Promise.all([
 'apps/web/index.html','apps/web/app.js','apps/web/horizon.css',
 'apps/mobile/app/index.tsx','apps/mobile/app/needmap.tsx',
 'apps/mobile/components/StitchChrome.tsx'
].map(file=>readFile(file,'utf8')));

function includes(value,needle,reason){assert.ok(value.includes(needle),reason)}
includes(html,'./horizon.css','responsive Horizon layer must be loaded');
includes(html,'name="description"','home must have accessible document metadata');
includes(web,'class="impact-hero"','home must render new community-action hero');
includes(web,'id="impact-title"','hero should have a labelled landmark');
includes(web,'#needs','discovery and reporting need to route to existing working page');
includes(web,'#impact','passport must link to existing permission-governed route');
includes(web,"await api('/v1/platform',{},false)",'lifecycle should load from real platform contract');
includes(web,'Current activity is temporarily unavailable','offline fallback must be labelled honestly');
includes(web,'Funding pledges are commitments','money-state truth boundary must remain visible');
includes(css,'@media(max-width:720px)','small-screen action layout is required');
includes(css,'prefers-reduced-motion','respect reduced motion');
includes(css,':focus-visible','keyboard focus must be visible');
includes(mobile,"apiFetch<PlatformDescription>('/v1/platform',{},false)",'home uses real platform contract');
includes(mobile,"reviewQueue:'1'",'offline coordinate recovery route must remain');
includes(mobile,'pendingNeedLocationReviewCount','offline status must stay visible');
for(const route of ['/needmap','/report','/workspace','/impact','/catalog']){
 includes(mobile,route,route+' must remain discoverable');
}
includes(mobile,'Your profile is self-declared','passport must separate local from evidenced data');
includes(map,"/v1/needs?lat=", 'NeedMap must use nearby server result, not fabricated locations');
includes(map,"type NeedFilter = 'all' | 'verified' | 'unverified'",'NeedMap requires evidence filters');
includes(map,"isConfirmed(need.verificationState)",'filter based on actual server verification state');
includes(map,'accessibilityState={{selected:filter===option.value}}','filter state accessible to assistive technology');
assert.ok(!map.includes('pinPositions'),'decorative pseudo-latitude pins must not be used');
assert.ok(!map.includes('pinPosition('),'index-based fake geography must not return');
includes(chrome,"router.push('/catalog')",'canonical catalog remains accessible');
includes(chrome,"router.push('/notifications')",'notifications remain universally accessible');
console.log('Horizon experience contract verified (web, mobile, live-state semantics, controls).');
