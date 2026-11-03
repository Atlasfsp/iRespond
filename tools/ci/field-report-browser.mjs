import {chromium} from '../docs-sync/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const deadline=setTimeout(()=>{console.error('Browser review exceeded 90 seconds.');process.exit(124)},90000);deadline.unref();
const out=process.env.EVIDENCE_DIR||'build/handoff/product-review-20261103';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const result={synthetic:true,nativeDevice:false};
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});await page.locator('#header-demo-signin').click();await page.evaluate(()=>location.hash='needs');
 await page.locator('#nearby-form input[name=lat]').fill('6.52');await page.locator('#nearby-form input[name=lng]').fill('3.37');await page.locator('#nearby-form button').click();
 const first=page.locator('#nearby-results').getByRole('link',{name:'Google Maps directions'}).first();await first.waitFor();assert.equal(new URL(await first.getAttribute('href')).searchParams.get('destination'),'6.5244,3.3792');
 assert.equal(await page.locator('#nearby-results').getByRole('link',{name:'Apple Maps directions'}).count(),3);
 assert.equal(await page.locator('#other-category-field').isVisible(),false);
 await page.locator('#report-form select[name=category]').selectOption('other');const detail=page.getByLabel('Other area of impact',{exact:true});await detail.waitFor({state:'visible'});assert.equal(await detail.getAttribute('required'),'');await detail.fill('Synthetic wildlife rescue');
 await page.locator('#report-form input[name=title]').fill('Synthetic field review');await page.locator('#report-form textarea[name=description]').fill('Not a real intervention.');await page.locator('#report-form input[name=latitude]').fill('0');await page.locator('#report-form input[name=longitude]').fill('0');await page.locator('#report-form input[name=locationConfirmed]').check();await page.locator('#report-form button[type=submit]').click();await page.locator('#report-result .notice.success').waitFor();assert.equal(new URL(await page.locator('#report-result').getByRole('link',{name:'Google Maps directions'}).getAttribute('href')).searchParams.get('destination'),'0,0');assert.match(await page.locator('#evidence-form input[name=needId]').inputValue(),/^demo-need/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/web-report-phone.png`,fullPage:true});result.web={directions:true,zeroCoordinates:true,otherCategory:true,evidenceDestinationPrefilled:true,runtimeErrors:errors};
 console.error('Web reporting checks passed.');
 if(process.env.WEB_ONLY!=='1'){
  const mobile=await browser.newPage({viewport:{width:390,height:844}});mobile.setDefaultTimeout(15000);mobile.setDefaultNavigationTimeout(20000);const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(e.message));
  await mobile.goto('http://127.0.0.1:4174/');await mobile.evaluate(()=>localStorage.setItem('irespond.demo-session.v1','1'));await mobile.goto('http://127.0.0.1:4174/profile');await mobile.getByText('Synthetic demo account',{exact:true}).waitFor();await mobile.getByText('community verifier · impact auditor · evidence reviewer · safety reviewer',{exact:true}).waitFor();
  await mobile.goto('http://127.0.0.1:4174/need/need-water-1');await mobile.getByRole('link',{name:'Get directions with Google Maps'}).waitFor();assert.equal(await mobile.getByRole('link',{name:'Get directions with Apple Maps'}).count(),1);
  const draft={title:'Synthetic recovery',description:'Test only',category:'other',categoryDetail:'Wildlife rescue',latitude:0,longitude:0,locationSource:'manual',locationConfirmedAt:'2026-11-03T00:00:00Z',evidenceUris:[],updatedAt:'2026-11-03T00:00:00Z'};
  await mobile.evaluate(d=>localStorage.setItem('irespond.need-draft.v1',JSON.stringify(d)),draft);await mobile.goto('http://127.0.0.1:4174/report');await mobile.getByLabel('Other area of impact',{exact:true}).waitFor();assert.equal(await mobile.getByLabel('Other area of impact',{exact:true}).inputValue(),'Wildlife rescue');
  await mobile.goto('http://127.0.0.1:4174/evidence');await mobile.getByRole('button',{name:'Record video',exact:true}).waitFor();assert.equal(await mobile.getByRole('button',{name:'Take a photo',exact:true}).isEnabled(),true);await mobile.screenshot({path:`${out}/mobile-evidence-phone.png`,fullPage:true});

  const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1kAAAAASUVORK5CYII=';
  await mobile.evaluate(({draft,pixel})=>localStorage.setItem('irespond.need-draft.v1',JSON.stringify({...draft,evidenceUris:[pixel,pixel,pixel,pixel]})),{draft,pixel});await mobile.reload();await mobile.getByText('Evidence attached',{exact:true}).waitFor();assert.equal(await mobile.getByRole('button',{name:'Take a photo',exact:true}).isDisabled(),true);
  for(let i=0;i<4;i++){await mobile.getByRole('button',{name:'Remove attachment 1',exact:true}).click();await mobile.waitForFunction(expected=>JSON.parse(localStorage.getItem('irespond.need-draft.v1')).evidenceUris.length===expected,3-i)}
  assert.equal(await mobile.getByRole('button',{name:'Take a photo',exact:true}).isEnabled(),true);await mobile.getByRole('button',{name:'Submit observation',exact:true}).click();await mobile.waitForURL('**/submissions');await mobile.getByRole('link').filter({hasText:'Synthetic recovery'}).click();await mobile.getByRole('link',{name:'Get directions with Google Maps'}).waitFor();
  assert.deepEqual(mobileErrors,[]);result.mobile={roles:true,directions:true,customCategoryRestored:true,photoVideoControls:true,fourPhotoCapAndRemoval:true,submissionHistoryAndNeedLink:true,runtimeErrors:mobileErrors};await mobile.close();
 }
 await writeFile(`${out}/browser-review.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();clearTimeout(deadline)}
