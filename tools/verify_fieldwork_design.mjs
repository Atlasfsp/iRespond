import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const [html,css,app,ts,home,chrome,contract] = await Promise.all([
 'apps/web/index.html','apps/web/fieldwork.css','apps/web/app.js',
 'apps/mobile/lib/fieldwork-theme.ts','apps/mobile/app/index.tsx',
 'apps/mobile/components/StitchChrome.tsx','docs/design/FIELDWORK_DESIGN_SYSTEM_V2.md'
].map(file=>readFile(file,'utf8')));
const requireText=(source,value,message)=>assert.ok(source.includes(value),message);
requireText(html,'./fieldwork.css','FIELDWORK presentation layer must be mounted');
assert.ok(html.indexOf('./fieldwork.css')>html.indexOf('./horizon.css'),'FIELDWORK overrides must load after Horizon');
for(const property of ['--fw-canvas','--fw-ink','--fw-leaf','--fw-coral','--fw-gold','--fw-iris','--fw-display']){
 requireText(css,property,'Missing web semantic token: '+property);
}
for(const key of ['canvas:','paper:','ink:','leaf:','coralText:','verified:','observed:','disputed:','focus:']){
 requireText(ts,key,'Missing native semantic token: '+key);
}
requireText(css,':focus-visible','Keyboard focus must remain visible');
requireText(css,'prefers-reduced-motion','Honor reduced motion');
requireText(css,'@media(max-width:680px)','Phone layout must exist');
for(const route of ['#needs','#project','#impact'])requireText(app,route,'Existing action navigation lost '+route);
requireText(app,"await api('/v1/platform',{},false)",'Platform lifecycle must derive from real API');
requireText(app,'Funding pledges are commitments','Money-state integrity is non-negotiable');
requireText(app,'Reports are observations','A community report is not automatically verified');
requireText(app,'Roles and project permissions','Do not fabricate role authority');
for(const route of ['/needmap','/report','/workspace','/impact','/catalog']){
 requireText(home,route,'Native route missing '+route);
}
requireText(home,"reviewQueue:'1'",'Offline coordinate recovery must remain');
requireText(home,'pendingNeedLocationReviewCount','Offline queue must stay visible');
requireText(chrome,"router.push('/notifications')",'Universal notification entry required');
requireText(chrome,"router.push('/catalog')",'Universal catalog entry required');
requireText(contract,'not a production release','Documentation must disclose the release boundary');
console.log('FIELDWORK design contract verified — tokens, responsive behavior, truth states, routes.');
