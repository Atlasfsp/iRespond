import {chromium} from '../docs-sync/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const axeSource=await readFile(new URL('../docs-sync/node_modules/axe-core/axe.min.js',import.meta.url),'utf8');
const output=process.env.EVIDENCE_DIR||'build/handoff/fieldwork-labels';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
try {
 for(const [width,height] of [[390,844],[768,1024],[1440,900]]) {
 const page=await browser.newPage({viewport:{width,height}});
 const runtimeErrors=[];page.on('pageerror',e=>runtimeErrors.push(e.message));
 await page.goto(process.env.WEB_URL||'http://127.0.0.1:4173',{waitUntil:'networkidle'});
 await page.locator('#header-demo-signin').click();
 for(const route of ['home','needs','verification','project','contributions','funding','impact','notifications','privacy','safety','safety-ops']) {
  await page.evaluate(route=>{location.hash=route},route);
  await page.waitForTimeout(350);
  await page.locator('main h1, main h2, main h3').first().waitFor();
  assert.equal(await page.getByRole('heading',{name:'Unable to load',exact:true}).count(),0,`${route}: route failed`);
  const missing=await page.locator('main').evaluate(main=>[...main.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(el=>!el.labels?.length&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')).map(el=>({tag:el.tagName,name:el.name})));
  await page.addScriptTag({content:axeSource});
  const audit=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  results.push({route,width,height,missing,overflow,violations:audit.violations,incomplete:audit.incomplete,runtimeErrors:[...runtimeErrors]});
 }
 await page.close();
 }
 await writeFile(`${output}/labels.json`,JSON.stringify({syntheticDemo:true,results},null,2)+'\n');
 assert.equal(results.reduce((sum,r)=>sum+r.missing.length,0),0,JSON.stringify(results.map(({route,width,missing})=>({route,width,missing}))));
 assert.equal(results.reduce((sum,r)=>sum+r.violations.length+r.runtimeErrors.length+Number(r.overflow),0),0,JSON.stringify(results.filter(r=>r.violations.length||r.runtimeErrors.length||r.overflow)));
} finally {await browser.close()}
