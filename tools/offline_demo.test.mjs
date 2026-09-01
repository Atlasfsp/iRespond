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
  assert.equal(body.project.status, 'executing');
  assert.equal(Array.isArray(body.milestones), true);
  assert.equal(Array.isArray(body.contributionNeeds), true);
  assert.equal(typeof body.permissions.canManageFunding, 'boolean');
});

const createdNeed = expectOk('/v1/needs', (body) => {
  assert.equal(body.title, 'New offline observation');
  assert.equal(body.verificationState, 'observed');
}, 'POST', { title: 'New offline observation', description: 'Created during the contract test.', category: 'water', latitude: 6.5, longitude: 3.4 });
expectOk(`/v1/needs/${createdNeed.id}`, (body) => assert.equal(body.id, createdNeed.id));
expectOk('/v1/needs', (body) => assert.equal(body.some((item) => item.id === createdNeed.id), true));

const unverifiedConversion = payload(`/v1/needs/${createdNeed.id}/project`, 'POST', { title: 'Must not exist yet' });
assert.equal(unverifiedConversion.status, 409);
assert.deepEqual(unverifiedConversion.body, { error: 'need must be verified before project conversion' });

expectOk(`/v1/needs/${createdNeed.id}/verification`, (body) => {
  assert.equal(body.verificationState, 'community_confirmed');
}, 'POST', { state: 'community_confirmed' });
expectOk(`/v1/needs/${createdNeed.id}`, (body) => assert.equal(body.verificationState, 'community_confirmed'));

const createdProject = expectOk(`/v1/needs/${createdNeed.id}/project`, (body) => {
  assert.equal(body.sourceNeedId, createdNeed.id);
  assert.equal(body.title, 'Safe classrooms follow-up');
  assert.equal(body.status, 'draft');
}, 'POST', { title: 'Safe classrooms follow-up', ownerCommunityId: 'community-school-1' });
expectOk(`/v1/projects/${createdProject.id}`, (body) => {
  assert.equal(body.project.id, createdProject.id);
  assert.equal(body.project.sourceNeedId, createdNeed.id);
  assert.deepEqual(body.milestones, []);
  assert.deepEqual(body.contributionNeeds, []);
});
expectOk(`/v1/needs/${createdNeed.id}/project`, (body) => assert.equal(body.id, createdProject.id));
assert.equal(payload(`/v1/projects/${createdProject.id}/funding`).status, 404);
const duplicateConversion = payload(`/v1/needs/${createdNeed.id}/project`, 'POST', { title: 'Duplicate project' });
assert.equal(duplicateConversion.status, 409);
assert.deepEqual(duplicateConversion.body, { error: 'need already has an action project' });

const projectWithoutManager = payload(`/v1/projects/${createdProject.id}/transition`, 'POST', { state: 'approved' });
assert.equal(projectWithoutManager.status, 409);
assert.deepEqual(projectWithoutManager.body, { error: 'project manager must accept role before approval' });
expectOk(`/v1/projects/${createdProject.id}/milestones`, (body) => {
  assert.equal(body.status, 'planned');
}, 'POST', { title: 'Confirm implementation scope', description: 'Required approval plan.', sequence: 1 });
const managerInvite = expectOk(`/v1/projects/${createdProject.id}/roles/invite`, (body) => {
  assert.equal(body.projectId, createdProject.id);
  assert.equal(body.invitedActorId, 'offline-demo-user');
  assert.equal(body.role, 'project_manager');
  assert.equal(body.status, 'pending');
}, 'POST', { actorId: 'offline-demo-user', role: 'project_manager' });
expectOk(`/v1/project-role-invites/${managerInvite.id}/accept`, (body) => {
  assert.equal(body.status, 'accepted');
  assert.equal(body.role, 'project_manager');
}, 'POST');
expectOk(`/v1/projects/${createdProject.id}/transition`, (body) => {
  assert.equal(body.status, 'approved');
}, 'POST', { state: 'approved' });
expectOk(`/v1/projects/${createdProject.id}`, (body) => assert.equal(body.project.status, 'approved'));

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
expectOk('/v1/me/notification-preferences', (body) => assert.equal(body.sms, true), 'PUT', { sms: true });
expectOk('/v1/me/notification-preferences', (body) => assert.equal(body.sms, true));
expectOk('/v1/me/notifications/notice-1/read', (body) => assert.match(body.readAt, /^2026-09-01T12:00:00\.000Z$/), 'POST');
expectOk('/v1/me/notifications', (body) => assert.match(body.find((item) => item.id === 'notice-1').readAt, /^2026-09-01T12:00:00\.000Z$/));
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
expectOk('/v1/projects/project-water-1/funding', (body) => assert.equal(body.targetMinor, 18_000_000_00));

const pledgedBefore = expectOk('/v1/projects/project-water-1/funding', (body) => assert.equal(Number.isInteger(body.pledgedMinor), true)).pledgedMinor;
const pledge = expectOk('/v1/projects/project-water-1/funding/pledges', (body) => {
  assert.equal(body.amountMinor, 50_000_00);
}, 'POST', { contributionClass: 'external_donation', amountMinor: 50_000_00 });
expectOk('/v1/me/funding/pledges', (body) => assert.equal(body.some((item) => item.id === pledge.id), true));
expectOk('/v1/projects/project-water-1/funding', (body) => assert.equal(body.pledgedMinor, pledgedBefore + 50_000_00));
expectOk(`/v1/funding/pledges/${pledge.id}/cancel`, (body) => assert.equal(body.status, 'cancelled'), 'POST');
expectOk('/v1/me/funding/pledges', (body) => assert.equal(body.find((item) => item.id === pledge.id).status, 'cancelled'));
expectOk('/v1/projects/project-water-1/funding', (body) => assert.equal(body.pledgedMinor, pledgedBefore));

const contributionOffer = expectOk('/v1/projects/project-water-1/contribution-needs/contribution-testing/offers', (body) => {
  assert.equal(body.status, 'offered');
}, 'POST', { note: 'I can bring test kits.', availabilityNote: 'Tomorrow' });
expectOk('/v1/me/contribution-offers', (body) => assert.equal(body.some((item) => item.id === contributionOffer.id), true));
const prematureFulfillment = payload(`/v1/projects/project-water-1/contribution-offers/${contributionOffer.id}/fulfill`, 'POST', {});
assert.equal(prematureFulfillment.status, 404);
assert.deepEqual(prematureFulfillment.body, { error: 'accepted contribution offer not found' });
expectOk(`/v1/contribution-offers/${contributionOffer.id}/withdraw`, (body) => assert.equal(body.status, 'withdrawn'), 'POST');
expectOk('/v1/me/contribution-offers', (body) => assert.equal(body.find((item) => item.id === contributionOffer.id).status, 'withdrawn'));

const acceptedOffer = expectOk('/v1/projects/project-water-1/contribution-needs/contribution-testing/offers', (body) => {
  assert.equal(body.status, 'offered');
}, 'POST', { note: 'Second local offer.', availabilityNote: 'This week' });
expectOk(`/v1/projects/project-water-1/contribution-offers/${acceptedOffer.id}/decision`, (body) => {
  assert.equal(body.status, 'accepted');
}, 'POST', { decision: 'accepted', closeNeed: false });
const repeatedDecision = payload(`/v1/projects/project-water-1/contribution-offers/${acceptedOffer.id}/decision`, 'POST', { decision: 'declined' });
assert.equal(repeatedDecision.status, 409);
assert.deepEqual(repeatedDecision.body, { error: 'only offered contributions may be accepted or declined' });
expectOk(`/v1/projects/project-water-1/contribution-offers/${acceptedOffer.id}/fulfill`, (body) => {
  assert.equal(body.status, 'fulfilled');
}, 'POST', {});
assert.deepEqual(payload(`/v1/projects/project-water-1/contribution-offers/${acceptedOffer.id}/fulfill`, 'POST', {}).body, { error: 'accepted contribution offer not found' });
expectOk('/v1/me/contribution-offers', (body) => assert.equal(body.find((item) => item.id === acceptedOffer.id).status, 'fulfilled'));

const newMilestone = expectOk('/v1/projects/project-water-1/milestones', (body) => {
  assert.equal(body.title, 'Demo closeout');
}, 'POST', { title: 'Demo closeout', description: 'Show read-through.', sequence: 4 });
expectOk('/v1/projects/project-water-1', (body) => assert.equal(body.milestones.some((item) => item.id === newMilestone.id), true));
expectOk(`/v1/projects/project-water-1/milestones/${newMilestone.id}/transition`, (body) => assert.equal(body.status, 'ready'), 'POST', { state: 'ready' });
expectOk('/v1/projects/project-water-1', (body) => assert.equal(body.milestones.find((item) => item.id === newMilestone.id).status, 'ready'));
const invalidMilestoneTransition = payload(`/v1/projects/project-water-1/milestones/${newMilestone.id}/transition`, 'POST', { state: 'validated' });
assert.equal(invalidMilestoneTransition.status, 409);
assert.deepEqual(invalidMilestoneTransition.body, { error: 'invalid milestone transition' });

const newContributionNeed = expectOk('/v1/projects/project-water-1/contribution-needs', (body) => {
  assert.equal(body.description, 'Community handover support');
}, 'POST', { kind: 'time', description: 'Community handover support', quantityNote: 'Two hours' });
expectOk('/v1/projects/project-water-1', (body) => assert.equal(body.contributionNeeds.some((item) => item.id === newContributionNeed.id), true));
const invalidProjectTransition = payload('/v1/projects/project-water-1/transition', 'POST', { state: 'completed' });
assert.equal(invalidProjectTransition.status, 409);
assert.deepEqual(invalidProjectTransition.body, { error: 'invalid project transition' });
const projectNotReady = payload('/v1/projects/project-water-1/transition', 'POST', { state: 'validating' });
assert.equal(projectNotReady.status, 409);
assert.deepEqual(projectNotReady.body, { error: 'all active milestones must be submitted before validation' });
expectOk('/v1/projects/project-water-1', (body) => assert.equal(body.project.status, 'executing'));

expectOk('/v1/projects/project-water-1/milestones/milestone-repair/transition', (body) => {
  assert.equal(body.id, 'milestone-repair');
  assert.equal(body.status, 'in_progress');
}, 'POST', { state: 'in_progress' });

expectOk('/v1/me/privacy/consents/impact-research', (body) => assert.equal(body.granted, true), 'PUT', { granted: true, policyVersion: '2026-08' });
expectOk('/v1/me/privacy/consents', (body) => assert.equal(body.find((item) => item.purpose === 'impact-research').granted, true));
const privacyRequest = expectOk('/v1/me/privacy/requests', (body) => assert.equal(body.type, 'access'), 'POST', { type: 'access' });
expectOk('/v1/me/privacy/requests', (body) => assert.equal(body.some((item) => item.id === privacyRequest.id), true));

const safetyReport = expectOk('/v1/safety/reports', (body) => assert.equal(body.status, 'received'), 'POST', { subjectType: 'platform', subjectId: 'general', reason: 'unsafe_activity', details: 'Demo report' });
expectOk('/v1/me/safety/reports', (body) => assert.equal(body.some((item) => item.id === safetyReport.id), true));
expectOk(`/v1/safety/reports/${safetyReport.id}/appeal`, (body) => assert.equal(body.status, 'appealed'), 'POST', { reason: 'Please review' });
expectOk('/v1/me/safety/reports', (body) => assert.equal(body.find((item) => item.id === safetyReport.id).status, 'appealed'));

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
  assert.notDeepEqual(result, { status: 404, body: { error: 'Offline demo route is not implemented.' } }, `${operation.operationId}: ${operation.method} ${path} must be implemented by the offline demo`);
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

const projectAdmin = await readFile('apps/mobile/app/project-admin.tsx', 'utf8');
assert.match(projectAdmin, /offerState==='offered'/);
assert.match(projectAdmin, /offerState==='accepted'/);
assert.match(projectAdmin, /submitted:canValidate\?'validated':'cancelled'/);
assert.match(projectAdmin, /disabled=\{!perms\.canManageMilestones\|\|!nextMilestoneState\(m\.status,false\)\}/);

console.log('offline demo contract: PASS');
