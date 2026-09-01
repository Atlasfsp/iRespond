import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import mobileConfig from '../apps/mobile/app.config.ts';
import {
  DEMO_API_BASE_URL,
  createDemoFetch,
  createDemoPayload,
  isDemoRequest,
} from '../apps/mobile/lib/demo-backend.ts';

const now = new Date('2026-09-01T12:00:00.000Z');
const apiMap = JSON.parse(await readFile('docs/frontend/frontend-api-map.json', 'utf8'));
const rootPackage = JSON.parse(await readFile('package.json', 'utf8'));

function payload(path, method = 'GET', requestBody) {
  return createDemoPayload(new URL(path, DEMO_API_BASE_URL), method, requestBody, now);
}

function expectOk(path, validate, method = 'GET', requestBody) {
  const result = payload(path, method, requestBody);
  assert.equal(result.status, 200, `${method} ${path} should succeed`);
  validate(result.body);
  return result.body;
}

assert.equal(isDemoRequest(`${DEMO_API_BASE_URL}/v1/platform`), true);
assert.equal(isDemoRequest('http://demo.irespond.local/v1/platform'), true);
assert.equal(isDemoRequest('https://api.irespond.example/v1/platform'), false);

let delegatedRequests = 0;
const guardedFetch = createDemoFetch(async () => {
  delegatedRequests += 1;
  return new Response(null, { status: 204 });
});
const blockedDiscovery = await guardedFetch('https://invalid.local/.well-known/openid-configuration');
assert.equal(blockedDiscovery.status, 503);
assert.deepEqual(await blockedDiscovery.json(), { error: 'External network requests are disabled in the offline demo.' });
assert.equal(delegatedRequests, 0, 'the offline demo must not delegate external HTTP requests');
assert.equal((await guardedFetch('data:text/plain,offline-demo')).status, 204);
assert.equal(delegatedRequests, 1, 'non-network URI schemes may use the platform fetch implementation');

expectOk('/v1/platform', (body) => {
  assert.equal(typeof body.name, 'string');
  assert.equal(Array.isArray(body.capabilities), true);
});

expectOk('/v1/session', (body) => {
  assert.equal(body.subject, 'offline-demo-user');
  assert.equal(Array.isArray(body.roles), true);
  assert.equal(body.roles.includes('safety_reviewer'), true);
});

expectOk('/v1/projects/project-water-1', (body) => {
  assert.equal(body.project.id, 'project-water-1');
  assert.equal(Array.isArray(body.milestones), true);
  assert.equal(Array.isArray(body.contributionNeeds), true);
  assert.equal(typeof body.permissions.canManageFunding, 'boolean');
});

const createdProject = expectOk('/v1/needs/need-school-1/project', (body) => {
  assert.equal(body.sourceNeedId, 'need-school-1');
  assert.equal(body.title, 'Safe classrooms follow-up');
}, 'POST', { title: 'Safe classrooms follow-up', ownerCommunityId: 'community-school-1' });
expectOk(`/v1/projects/${createdProject.id}`, (body) => {
  assert.equal(body.project.id, createdProject.id);
  assert.equal(body.project.sourceNeedId, 'need-school-1');
});
expectOk('/v1/needs/need-school-1/project', (body) => assert.equal(body.id, createdProject.id));

expectOk('/v1/me/impact-passport', (body) => {
  assert.equal(body.subject, 'offline-demo-user');
  assert.equal(Array.isArray(body.contributions), true);
  assert.equal(Array.isArray(body.roles), true);
  assert.equal(Array.isArray(body.sdgs), true);
  assert.match(body.generatedAt, /^2026-09-01T12:00:00\.000Z$/);
});

expectOk('/v1/me/notifications', (body) => assert.equal(Array.isArray(body), true));
expectOk('/v1/me/notification-preferences', (body) => {
  assert.equal(typeof body.email, 'boolean');
  assert.equal(typeof body.inApp, 'boolean');
  assert.equal(typeof body.push, 'boolean');
});
expectOk('/v1/projects/project-water-1/funding', (body) => {
  assert.equal(body.currency, 'NGN');
  assert.equal(Number.isInteger(body.targetMinor), true);
});
expectOk('/v1/me/safety/reports', (body) => assert.equal(Array.isArray(body), true));
expectOk('/v1/safety/review-queue', (body) => assert.equal(Array.isArray(body), true));
expectOk('/v1/me/privacy/consents', (body) => {
  assert.equal(Array.isArray(body), true);
  assert.equal(typeof body[0].policyVersion, 'string');
});
expectOk('/v1/me/privacy/requests', (body) => {
  assert.equal(Array.isArray(body), true);
  assert.equal(typeof body[0].type, 'string');
  assert.equal(typeof body[0].requestedAt, 'string');
});
expectOk('/v1/needs/need-water-1/evidence/demo-evidence/access', (body) => {
  assert.equal(body.available, false);
  assert.equal(body.url, undefined);
  assert.match(body.unavailableReason, /not bundled/i);
});

const upload = expectOk('/v1/needs/need-water-1/evidence/uploads', (body) => {
  assert.equal(body.method, 'PUT');
  assert.equal(isDemoRequest(body.uploadUrl), true);
}, 'POST', { contentType: 'image/jpeg', sizeBytes: 1024 });
expectOk(new URL(upload.uploadUrl).pathname, (body) => assert.equal(body.stored, true), 'PUT');
expectOk('/v1/needs/need-water-1/evidence/demo-evidence/complete', (body) => assert.equal(body.status, 'pending_review'), 'POST');

expectOk('/v1/projects/project-water-1/funding', (body) => {
  assert.equal(body.targetMinor, 18_000_000_00);
}, 'PUT', { currency: 'NGN', targetMinor: 18_000_000_00, communityCounterpartMinor: 2_000_000_00 });

expectOk('/v1/projects/project-water-1/milestones/milestone-repair/transition', (body) => {
  assert.equal(body.id, 'milestone-repair');
  assert.equal(body.status, 'in_progress');
}, 'POST', { state: 'in_progress' });

const missing = payload('/v1/not-a-real-route');
assert.equal(missing.status, 404);
assert.deepEqual(missing.body, { error: 'Offline demo route is not implemented.' });

function fixturePath(path) {
  return path
    .replace('{evidenceId}', 'demo-evidence')
    .replace('{milestoneId}', 'milestone-repair')
    .replace('{inviteId}', 'invite-1')
    .replace('{offerId}', 'offer-1')
    .replace('{pledgeId}', 'pledge-1')
    .replace('{purpose}', 'impact-research')
    .replace('{needId}', 'contribution-plumber')
    .replace('{id}', path.startsWith('/v1/projects/')
      ? 'project-water-1'
      : path.startsWith('/v1/me/notifications/')
        ? 'notice-1'
        : path.startsWith('/v1/safety/reports/')
          ? 'safety-1'
          : 'need-water-1');
}

for (const operation of apiMap.operations) {
  const path = fixturePath(operation.path);
  const result = payload(path, operation.method, {});
  assert.notEqual(result.status, 404, `${operation.operationId}: ${operation.method} ${path} must be implemented by the offline demo`);
}

const productionConfig = mobileConfig({
  config: {
    name: 'iRespond',
    slug: 'irespond',
    scheme: 'irespond',
    version: '0.1.0',
    android: { package: 'global.irespond.app' },
    ios: { bundleIdentifier: 'global.irespond.app' },
  },
});
assert.equal(productionConfig.android?.package, 'global.irespond.app');

process.env.EXPO_PUBLIC_DEMO_MODE = '1';
const demoConfig = mobileConfig({ config: productionConfig });
assert.equal(demoConfig.name, 'iRespond Offline Demo');
assert.equal(demoConfig.slug, 'irespond-offline-demo');
assert.equal(demoConfig.scheme, 'irespond-demo');
assert.equal(demoConfig.android?.package, 'global.irespond.app.demo');
assert.equal(demoConfig.ios?.bundleIdentifier, 'global.irespond.app.demo');
delete process.env.EXPO_PUBLIC_DEMO_MODE;

const workflow = await readFile('.github/workflows/build-android-demo.yml', 'utf8');
assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /github\.event\.pull_request\.head\.sha/);
assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d+/);
assert.match(workflow, /global\.irespond\.app\.demo/);
assert.match(workflow, /iRespond-offline-demo-arm64-/);
assert.match(workflow, /sha256sum/);

const metroPatchPath = rootPackage.pnpm?.patchedDependencies?.['metro@0.82.5'];
assert.equal(metroPatchPath, 'patches/metro@0.82.5.patch');
const metroPatch = await readFile(metroPatchPath, 'utf8');
assert.match(metroPatch, /imageSizeModule\.imageSize \?\? imageSizeModule/);
assert.match(metroPatch, /typeof isImageInput === "string" \? fs\.readFileSync\(isImageInput\) : isImageInput/);

const reactNativeConfig = await readFile('apps/mobile/react-native.config.js', 'utf8');
assert.match(reactNativeConfig, /import expo\.modules\.ExpoModulesPackage;/);
assert.match(reactNativeConfig, /new ExpoModulesPackage\(\)/);

const verificationWorkspace = await readFile('apps/mobile/app/verify.tsx', 'utf8');
assert.match(verificationWorkspace, /access\.unavailableReason/);

console.log('offline demo contract: PASS');
