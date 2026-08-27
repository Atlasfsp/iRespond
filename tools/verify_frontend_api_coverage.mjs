import { readFile } from 'node:fs/promises';

const openapi = await readFile('services/api/openapi.yaml', 'utf8');
const map = JSON.parse(await readFile('docs/frontend/frontend-api-map.json', 'utf8'));
const manifest = JSON.parse(await readFile('docs/frontend/STITCH_SOURCE_MANIFEST.json', 'utf8'));
const operationIds = [...openapi.matchAll(/^\s*operationId:\s*([A-Za-z0-9_]+)\s*$/gm)].map((match) => match[1]);
const exclusions = new Set(Object.keys(map.coveragePolicy?.excludedOperations || {}));
const expected = new Set(operationIds.filter((id) => !exclusions.has(id)));
const mapped = new Map((map.operations || []).map((entry) => [entry.operationId, entry]));
const screenIds = new Set([...(manifest.suppliedScreens || []), ...(manifest.extendedScreens || []).map((screen) => screen.id)]);
const failures = [];
if (manifest.archive?.suppliedScreenCount !== 77 || manifest.suppliedScreens?.length !== 77) failures.push(`Stitch supplied screen inventory must contain exactly 77 screens; found ${manifest.suppliedScreens?.length ?? 0}`);
if ((manifest.extendedScreens?.length || 0) < 1) failures.push('At least one iRespond design-system extension is required for backend capabilities absent from Stitch.');
if (new Set(manifest.suppliedScreens).size !== manifest.suppliedScreens.length) failures.push('Supplied Stitch screen ids must be unique.');
if (screenIds.size !== (manifest.suppliedScreens.length + manifest.extendedScreens.length)) failures.push('Stitch and extended screen ids must be globally unique.');
for (const operationId of expected) { const entry=mapped.get(operationId); if(!entry){failures.push(`OpenAPI operation ${operationId} has no canonical frontend owner.`);continue;} if(!Array.isArray(entry.screens)||entry.screens.length===0)failures.push(`${operationId}: at least one screen is required.`); if(!Array.isArray(entry.mobileRoutes)||entry.mobileRoutes.length===0)failures.push(`${operationId}: at least one mobile route is required.`); if(!Array.isArray(entry.webRoutes)||entry.webRoutes.length===0)failures.push(`${operationId}: at least one web route is required.`); for(const screen of entry.screens||[])if(!screenIds.has(screen))failures.push(`${operationId}: unknown screen ${screen}.`); }
for (const operationId of mapped.keys()) if(!expected.has(operationId)) failures.push(`frontend-api-map references unknown or excluded operation ${operationId}.`);
for (const excluded of exclusions) if(!operationIds.includes(excluded)) failures.push(`Excluded operation ${excluded} does not exist in OpenAPI; remove stale exclusion.`);
if (expected.size !== 45) failures.push(`Expected 45 user-facing OpenAPI operations for this candidate; found ${expected.size}. Update the coverage decision explicitly if the API changes.`);
if (failures.length) { console.error('Frontend/API coverage FAILED'); for(const failure of failures)console.error(`- ${failure}`); process.exit(1); }
console.log(`Frontend/API coverage verified: ${expected.size} user-facing operations, ${manifest.suppliedScreens.length} supplied Stitch screens, ${manifest.extendedScreens.length} design-system extensions.`);
