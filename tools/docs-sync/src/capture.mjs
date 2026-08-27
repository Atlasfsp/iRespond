import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(process.argv[2] || '.');
const baseURL = process.env.DOCS_CAPTURE_BASE_URL;
if (!baseURL) {
  console.error('DOCS_CAPTURE_BASE_URL is required for runtime screenshot capture. Source fingerprinting remains the mandatory fallback when no documentation-safe preview exists.');
  process.exit(2);
}
const manifest = JSON.parse(await readFile(path.join(root, 'docs/documentation-system/screen-manifest.json'), 'utf8'));
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({
  viewport:{width:manifest.viewport.width,height:manifest.viewport.height},
  deviceScaleFactor:manifest.viewport.deviceScaleFactor || 1,
  geolocation:{latitude:6.5244,longitude:3.3792},
  permissions:['geolocation'],
  locale:'en-CA',
  timezoneId:'America/Moncton'
});

if (process.env.DOCS_CAPTURE_INIT_SCRIPT) {
  await context.addInitScript({content:process.env.DOCS_CAPTURE_INIT_SCRIPT});
}

const results=[];
for (const screen of manifest.screens) {
  const page = await context.newPage();
  const url = new URL(screen.route, baseURL).toString();
  const target = path.join(root, screen.screenshot);
  await mkdir(path.dirname(target), {recursive:true});
  try {
    await page.goto(url, {waitUntil:'networkidle', timeout:45000});
    await page.getByText(screen.expectedText, {exact:false}).first().waitFor({state:'visible',timeout:15000});
    await page.screenshot({path:target,fullPage:true,animations:'disabled'});
    const bytes = await readFile(target);
    results.push({id:screen.id,route:screen.route,screenshot:screen.screenshot,sha256:createHash('sha256').update(bytes).digest('hex'),status:'captured'});
  } catch (error) {
    results.push({id:screen.id,route:screen.route,status:'failed',error:String(error)});
  } finally {
    await page.close();
  }
}
await browser.close();
const failed=results.filter(r=>r.status==='failed');
const report={schema:'irespond.documentation-runtime-capture.v1',sourceRevision:process.env.GITHUB_SHA||'local',baseURL,results};
await writeFile(path.join(root,'docs/documentation-system/runtime-capture.generated.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report));
if (failed.length) process.exit(1);
