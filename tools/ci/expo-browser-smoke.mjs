import {chromium} from '../docs-sync/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4174',{waitUntil:'networkidle'});
 await page.getByText('Change begins with').first().waitFor({timeout:10000});
 await page.screenshot({path:'build/evidence/completion/fieldwork-expo-phone.png',fullPage:true});
 assert.equal(errors.length,0,errors.join('\n'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await writeFile('build/evidence/completion/expo-browser-smoke.json',JSON.stringify({surface:'Expo React Native Web',nativeDevice:false,width:390,height:844,runtimeErrors:errors},null,2)+'\n');
} finally {await browser.close()}
