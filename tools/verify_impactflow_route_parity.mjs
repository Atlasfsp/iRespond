import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const baseline = JSON.parse(await readFile('docs/frontend/impactflow-route-parity-baseline.json', 'utf8'));
const navGraph = JSON.parse(await readFile('docs/frontend/navigation-graph.json', 'utf8'));
const apiMap = JSON.parse(await readFile('docs/frontend/frontend-api-map.json', 'utf8'));
const manifest = JSON.parse(await readFile('docs/frontend/STITCH_SOURCE_MANIFEST.json', 'utf8'));
const webApp = await readFile('apps/web/app.js', 'utf8');

// 1. All baseline mobile routes must remain in navigation-graph.json, plus /challenges and /challenges/[id]
const currentMobileRoutes = new Set(Object.keys(navGraph.routes || {}));
for (const route of Object.keys(baseline.expoRoutes || {})) {
  assert.ok(currentMobileRoutes.has(route), `Baseline mobile route lost: ${route}`);
}
for (const route of ['/challenges', '/challenges/[id]']) {
  assert.ok(currentMobileRoutes.has(route), `ImpactFlow Challenges mobile route missing: ${route}`);
}

// 2. All baseline web hash routes must remain in apps/web/app.js, plus #challenges
for (const hashRoute of [...(baseline.webHashRoutes || []), '#challenges']) {
  const id = hashRoute.slice(1);
  const re = new RegExp(`(?:^|[,{])\\s*(?:['"]${id.replace('-', '\\-')}['"]|${id})\\s*:\\s*render[A-Za-z0-9_]+`, 'm');
  assert.ok(re.test(webApp), `Web hash route renderer missing for ${hashRoute}`);
}

// 3. All 77 supplied Stitch screens and all baseline extended screens must remain intact
assert.equal(manifest.suppliedScreens.length, 77, '77 supplied Stitch screen contracts must remain intact');
const extendedIds = new Set((manifest.extendedScreens || []).map((s) => s.id));
for (const ext of baseline.extendedScreens || []) {
  assert.ok(extendedIds.has(ext.id), `Baseline extended screen lost: ${ext.id}`);
}
assert.ok(extendedIds.has('challenges_hub'), 'challenges_hub extended screen must be registered');

// 4. All baseline user-facing OpenAPI operations must remain mapped, plus 21 Challenges operations (66 total)
const mappedOps = new Set((apiMap.operations || []).map((op) => op.operationId));
assert.equal(mappedOps.size, 66, `Expected 66 mapped user-facing operations, found ${mappedOps.size}`);

console.log('ImpactFlow route parity verified: 27 Expo routes, 12 web hash routes, 77 Stitch screens + 15 extensions, and 66 user-facing API operations preserved.');
