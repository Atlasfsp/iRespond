import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { SERVER_TRUTH_LABELS, renderStatusPill } from '../apps/web/impactflow-components.mjs';

const [webApp, webCss, mobileHome, mobileChallenges, mobileChallengeDetail, gaDoc, boundaryDoc] = await Promise.all([
  readFile('apps/web/app.js', 'utf8'),
  readFile('apps/web/impactflow.css', 'utf8'),
  readFile('apps/mobile/app/index.tsx', 'utf8'),
  readFile('apps/mobile/app/challenges.tsx', 'utf8'),
  readFile('apps/mobile/app/challenges/[id].tsx', 'utf8'),
  readFile('docs/GA_READINESS.md', 'utf8'),
  readFile('docs/PRODUCT_BOUNDARY.md', 'utf8'),
]);

// 1. Single browser runtime invariant: apps/web/app-v2.js must not exist
let appV2Exists = false;
try {
  await access('apps/web/app-v2.js');
  appV2Exists = true;
} catch {
  appV2Exists = false;
}
assert.equal(appV2Exists, false, 'apps/web/app-v2.js is forbidden; apps/web/app.js is the single browser runtime');

// 2. Illustrative concept numbers (12,340 / 12340) must never be hardcoded as live metrics
for (const [name, content] of [
  ['apps/web/app.js', webApp],
  ['apps/mobile/app/index.tsx', mobileHome],
  ['apps/mobile/app/challenges.tsx', mobileChallenges],
  ['apps/mobile/app/challenges/[id].tsx', mobileChallengeDetail],
]) {
  assert.ok(!content.includes('12,340') && !content.includes('12340'), `${name} must never hardcode illustrative concept number 12,340`);
}

// 3. Truth state separation in ImpactFlow component primitives
assert.notEqual(
  SERVER_TRUTH_LABELS.observed.text,
  SERVER_TRUTH_LABELS.community_confirmed.text,
  'Observed and confirmed need states must never share a label'
);
assert.notEqual(
  SERVER_TRUTH_LABELS.pledged.text,
  SERVER_TRUTH_LABELS.confirmed.text,
  'Pledged and confirmed funding states must never share a label'
);
assert.notEqual(
  SERVER_TRUTH_LABELS.approved.text,
  SERVER_TRUTH_LABELS.confirmed_delivered.text,
  'Approved award and fulfilled prize states must never share a label'
);
assert.ok(renderStatusPill('pledged').includes('not settled'), 'Pledged badge must disclose non-settlement');

// 4. Web & mobile Challenge surfaces must explicitly disclose sponsor & award settlement truth boundaries
assert.ok(
  webApp.includes('Sponsor pledges are distinguished from externally settled PayCore receipts; approved awards are distinguished from fulfilled prizes.'),
  'Web Challenges view must state sponsor/award settlement truth boundary'
);
assert.ok(
  mobileChallengeDetail.includes('Sponsor commitments distinguish pledged funds from settled PayCore receipts; approved awards are distinguished from fulfilled prizes.'),
  'Mobile Challenge detail must state sponsor/award settlement truth boundary'
);

// 5. Contrast & primary button token invariant
assert.ok(webCss.includes('var(--if-color-action-primary)'), 'Primary buttons must use --if-color-action-primary (#0A6C50)');

// 6. GA release boundary must remain ga=false
assert.ok(gaDoc.includes('`ga=false`') || boundaryDoc.includes('not a GA release') || gaDoc.includes('NOT GA'), 'GA boundary disclosure must remain intact');

console.log('ImpactFlow truth states verified: observation != verification, pledge != settlement, award != fulfilment, no mockup numbers, single web runtime.');
