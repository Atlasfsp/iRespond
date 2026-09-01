import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

import {
  confirmPreviewRevision,
  resetCaptureTarget,
  verifyPreviewRevision,
} from './capture-support.mjs';

const root = path.resolve(process.argv[2] || '.');
const defaultBaseURL = process.env.DOCS_CAPTURE_BASE_URL || '';
const mobileBaseURL = process.env.DOCS_CAPTURE_MOBILE_BASE_URL || defaultBaseURL;
const webBaseURL = process.env.DOCS_CAPTURE_WEB_BASE_URL || defaultBaseURL;
const defaultRevisionURL = process.env.DOCS_CAPTURE_REVISION_URL || '';
const mobileRevisionURL = process.env.DOCS_CAPTURE_MOBILE_REVISION_URL || defaultRevisionURL;
const webRevisionURL = process.env.DOCS_CAPTURE_WEB_REVISION_URL || defaultRevisionURL;
const expectedRevision = process.env.GITHUB_SHA || process.env.DOCS_CAPTURE_EXPECTED_REVISION || '';
if (!mobileBaseURL && !webBaseURL) {
  console.error('A documentation-safe capture base URL is required for runtime screenshots. Source fingerprinting remains mandatory when no preview exists.');
  process.exit(2);
}
const manifest = JSON.parse(await readFile(path.join(root, 'docs/documentation-system/screen-manifest.json'), 'utf8'));
const baseURLs = { mobile: mobileBaseURL, web: webBaseURL };
const revisionURLs = { mobile: mobileRevisionURL, web: webRevisionURL };
const requiredSurfaces = [...new Set(manifest.screens.map((screen) => screen.surface || 'mobile'))];
const initialRevisionChecks = {};
for (const surface of requiredSurfaces) {
  if (!baseURLs[surface]) {
    initialRevisionChecks[surface] = { verified: false, observedRevision: null, error: `No documentation-safe ${surface} preview URL configured.` };
    continue;
  }
  initialRevisionChecks[surface] = await verifyPreviewRevision(revisionURLs[surface], expectedRevision);
}
const anyVerifiedSurface = Object.values(initialRevisionChecks).some((check) => check.verified);
const browser = anyVerifiedSurface ? await chromium.launch({headless:true}) : null;
const context = browser ? await browser.newContext({
  viewport:{width:manifest.viewport.width,height:manifest.viewport.height},
  deviceScaleFactor:manifest.viewport.deviceScaleFactor || 1,
  geolocation:{latitude:6.5244,longitude:3.3792},
  permissions:['geolocation'],
  locale:'en-CA',
  timezoneId:'America/Moncton'
}) : null;

if (context && process.env.DOCS_CAPTURE_INIT_SCRIPT) {
  await context.addInitScript({content:process.env.DOCS_CAPTURE_INIT_SCRIPT});
}

const results=[];
for (const screen of manifest.screens) {
  const surface=screen.surface||'mobile';
  const baseURL=baseURLs[surface];
  const target = path.join(root, screen.screenshot);
  await resetCaptureTarget(target);
  if(!baseURL){
    results.push({id:screen.id,surface,route:screen.route,status:'failed',error:`No documentation-safe ${surface} preview URL configured.`});
    continue;
  }
  const revisionCheck=initialRevisionChecks[surface];
  if(!revisionCheck?.verified){
    results.push({id:screen.id,surface,route:screen.route,status:'failed',error:revisionCheck?.error||`The ${surface} preview revision could not be verified.`});
    continue;
  }
  const page = await context.newPage();
  const url = new URL(screen.route, baseURL).toString();
  try {
    await page.goto(url, {waitUntil:'networkidle', timeout:45000});
    let anchorMatched=true;
    let anchorWarning=null;
    if(screen.expectedText){
      try{
        await page.getByText(screen.expectedText, {exact:false}).first().waitFor({state:'visible',timeout:8000});
      }catch(error){
        anchorMatched=false;
        anchorWarning=`Expected documentation anchor changed or is not visible: ${screen.expectedText}. ${String(error)}`;
      }
    }
    // Capture the rendered UI even when an expected text anchor changed. That
    // mismatch is itself documentation evidence and must reach the review PR.
    await page.screenshot({path:target,fullPage:true,animations:'disabled'});
    const bytes = await readFile(target);
    results.push({id:screen.id,surface,route:screen.route,screenshot:screen.screenshot,sha256:createHash('sha256').update(bytes).digest('hex'),status:'captured',anchorMatched,anchorWarning});
  } catch (error) {
    results.push({id:screen.id,surface,route:screen.route,status:'failed',error:String(error)});
  } finally {
    await page.close();
  }
}
if (browser) await browser.close();
const revisionChecks = {};
for (const surface of requiredSurfaces) {
  revisionChecks[surface] = await confirmPreviewRevision(
    revisionURLs[surface],
    expectedRevision,
    initialRevisionChecks[surface],
  );
  if (!revisionChecks[surface].verified && initialRevisionChecks[surface]?.verified) {
    for (const screen of manifest.screens.filter((candidate) => (candidate.surface || 'mobile') === surface)) {
      await resetCaptureTarget(path.join(root, screen.screenshot));
    }
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      if (result.surface === surface && result.status === 'captured') {
        results[index] = {
          id: result.id,
          surface: result.surface,
          route: result.route,
          status: 'failed',
          error: revisionChecks[surface].error,
        };
      }
    }
  }
}
const allRevisionsVerified = requiredSurfaces.length > 0
  && requiredSurfaces.every((surface) => revisionChecks[surface]?.verified);
const report={
  schema:'irespond.documentation-runtime-capture.v2',
  sourceRevision:allRevisionsVerified?expectedRevision:null,
  expectedSourceRevision:expectedRevision||null,
  baseURLs:{mobile:mobileBaseURL||null,web:webBaseURL||null},
  revisionURLs:{mobile:mobileRevisionURL||null,web:webRevisionURL||null},
  revisionChecks,
  results
};
await writeFile(path.join(root,'docs/documentation-system/runtime-capture.generated.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report));
const failed=results.filter(result=>result.status==='failed').length;
const anchorMismatches=results.filter(result=>result.anchorMatched===false).length;
if(failed||anchorMismatches) console.warn(`Documentation runtime capture requires review: ${failed} failed route(s), ${anchorMismatches} changed anchor(s). The source/screenshot report is still published for review.`);
