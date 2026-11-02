import {chromium} from '../docs-sync/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const output='build/evidence/completion';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
try {
 for(const [label,width,height] of [['desktop',1440,1000],['tablet',768,1024],['phone',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(5000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
  await page.screenshot({path:`${output}/fieldwork-web-${label}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${label} horizontal overflow`);
  assert.equal(errors.length,0,errors.join('\n'));
  await page.locator('.hero-actions a[href="#needs"]').click();
  await page.waitForTimeout(200);
  results.push({label,width,height,overflow:false,runtimeErrors:errors});
  await page.close();
 }
 await writeFile(`${output}/browser-smoke.json`,JSON.stringify(results,null,2)+'\n');
} finally {await browser.close()}
