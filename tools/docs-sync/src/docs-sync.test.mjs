import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(sourceDir, '../../..');

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'irespond-docs-sync-'));
  await mkdir(path.join(root, 'docs/documentation-system'), { recursive: true });
  return root;
}

async function jsonFile(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
}

async function run(script, root, environment = {}) {
  return execFileAsync(process.execPath, [path.join(sourceDir, script), root], {
    env: { ...process.env, ...environment },
  });
}

test('fingerprint includes rendered image, vector, and font assets', async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await jsonFile(path.join(root, 'docs/documentation-system/screen-manifest.json'), {
    trackedFrontendRoots: ['apps/mobile', 'apps/web'],
    screens: [],
  });
  await mkdir(path.join(root, 'apps/mobile/assets'), { recursive: true });
  await mkdir(path.join(root, 'apps/web/fonts'), { recursive: true });
  await writeFile(path.join(root, 'apps/mobile/assets/hero.png'), Buffer.from([0, 1, 2]));
  await writeFile(path.join(root, 'apps/web/icon.svg'), '<svg></svg>');
  await writeFile(path.join(root, 'apps/web/fonts/interface.woff2'), Buffer.from([3, 4, 5]));

  await run('fingerprint.mjs', root, { GITHUB_SHA: 'asset-head' });
  const result = JSON.parse(await readFile(
    path.join(root, 'docs/documentation-system/ui-fingerprint.generated.json'),
    'utf8',
  ));

  assert.deepEqual(Object.keys(result.sources), [
    'apps/mobile/assets/hero.png',
    'apps/web/fonts/interface.woff2',
    'apps/web/icon.svg',
  ]);
});

test('compare accepts runtime evidence only from the current source revision', async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await jsonFile(path.join(root, 'docs/documentation-system/screen-manifest.json'), { screens: [] });
  await jsonFile(path.join(root, 'docs/documentation-system/current-baseline.json'), {
    sourceRevision: 'baseline-head',
    sources: {},
    screenshots: {},
  });
  await jsonFile(path.join(root, 'docs/documentation-system/ui-fingerprint.generated.json'), {
    sourceRevision: 'current-head',
    sources: {},
  });
  const runtimePath = path.join(root, 'docs/documentation-system/runtime-capture.generated.json');
  await jsonFile(runtimePath, {
    sourceRevision: 'predecessor-head',
    results: [{ id: 'home', status: 'failed', error: 'stale failure' }],
  });

  await run('compare-and-plan.mjs', root, { GITHUB_SHA: 'current-head' });
  let report = JSON.parse(await readFile(
    path.join(root, 'docs/documentation-system/ui-change-report.generated.json'),
    'utf8',
  ));
  assert.equal(report.runtimeCaptureAvailable, false);
  assert.deepEqual(report.runtimeFailures, []);
  assert.equal(report.action, 'none');

  await jsonFile(runtimePath, {
    sourceRevision: null,
    expectedSourceRevision: 'current-head',
    results: [{ id: 'home', status: 'failed', error: 'current revision was not verified' }],
  });
  await run('compare-and-plan.mjs', root, { GITHUB_SHA: 'current-head' });
  report = JSON.parse(await readFile(
    path.join(root, 'docs/documentation-system/ui-change-report.generated.json'),
    'utf8',
  ));
  assert.equal(report.runtimeCaptureAvailable, false);
  assert.equal(report.runtimeCaptureAttempted, true);
  assert.equal(report.runtimeFailures.length, 1);

  await jsonFile(runtimePath, {
    sourceRevision: 'current-head',
    expectedSourceRevision: 'current-head',
    results: [{ id: 'home', status: 'failed', error: 'current failure' }],
  });
  await run('compare-and-plan.mjs', root, { GITHUB_SHA: 'current-head' });
  report = JSON.parse(await readFile(
    path.join(root, 'docs/documentation-system/ui-change-report.generated.json'),
    'utf8',
  ));
  assert.equal(report.runtimeCaptureAvailable, true);
  assert.equal(report.runtimeFailures.length, 1);
  assert.equal(report.action, 'regenerate-manual-interface-sections');
});

test('compare removes a missing current screenshot from the next baseline', async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await jsonFile(path.join(root, 'docs/documentation-system/screen-manifest.json'), {
    screens: [{
      id: 'home',
      source: 'apps/mobile/app/index.tsx',
      screenshot: 'docs/screenshots/current/home.png',
    }],
  });
  await jsonFile(path.join(root, 'docs/documentation-system/current-baseline.json'), {
    sourceRevision: 'baseline-head',
    sources: {},
    screenshots: { home: 'predecessor-image-hash' },
  });
  await jsonFile(path.join(root, 'docs/documentation-system/ui-fingerprint.generated.json'), {
    sourceRevision: 'current-head',
    sources: {},
  });

  await run('compare-and-plan.mjs', root, {
    GITHUB_SHA: 'current-head',
    DOCS_SYNC_UPDATE_BASELINE: '1',
  });
  const report = JSON.parse(await readFile(
    path.join(root, 'docs/documentation-system/ui-change-report.generated.json'),
    'utf8',
  ));
  const baseline = JSON.parse(await readFile(
    path.join(root, 'docs/documentation-system/current-baseline.json'),
    'utf8',
  ));
  assert.deepEqual(report.screenshotChanges, [{
    id: 'home',
    screenshot: 'docs/screenshots/current/home.png',
    previous: 'predecessor-image-hash',
    current: null,
    reason: 'missing-current-image',
  }]);
  assert.deepEqual(baseline.screenshots, {});
});

test('preview revision must be externally verified before capture is current', async () => {
  const { confirmPreviewRevision, verifyPreviewRevision } = await import('./capture-support.mjs');
  const expected = '8140824caa417363961ef332eb251313c9fa9ad3';
  const current = await verifyPreviewRevision(
    'https://preview.invalid/version',
    expected,
    async () => new Response(JSON.stringify({ sourceRevision: expected }), { status: 200 }),
  );
  const stale = await verifyPreviewRevision(
    'https://preview.invalid/version',
    expected,
    async () => new Response(JSON.stringify({ sourceRevision: 'predecessor-head' }), { status: 200 }),
  );
  const absent = await verifyPreviewRevision('', expected, async () => new Response(expected));

  assert.deepEqual(current, { verified: true, observedRevision: expected, error: null });
  assert.equal(stale.verified, false);
  assert.equal(stale.observedRevision, 'predecessor-head');
  assert.match(stale.error, /does not match expected revision/);
  assert.equal(absent.verified, false);
  assert.match(absent.error, /revision URL is required/);

  const changedAfterCapture = await confirmPreviewRevision(
    'https://preview.invalid/version',
    expected,
    current,
    async () => new Response(JSON.stringify({ sourceRevision: 'successor-head' }), { status: 200 }),
  );
  assert.equal(changedAfterCapture.verified, false);
  assert.equal(changedAfterCapture.beforeObservedRevision, expected);
  assert.equal(changedAfterCapture.afterObservedRevision, 'successor-head');
  assert.match(changedAfterCapture.error, /changed during capture/);
});

test('capture resets a predecessor screenshot before attempting replacement', async (t) => {
  const { resetCaptureTarget } = await import('./capture-support.mjs');
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = path.join(root, 'docs/screenshots/current/home.png');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, 'predecessor image');

  await resetCaptureTarget(target);

  await assert.rejects(readFile(target), { code: 'ENOENT' });
});

test('publication applies only manifest-registered screenshot removals', async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const screenshot = 'docs/screenshots/current/home.png';
  await jsonFile(path.join(root, 'docs/documentation-system/screen-manifest.json'), {
    screens: [{ id: 'home', screenshot }],
  });
  await jsonFile(path.join(root, 'docs/documentation-system/ui-change-report.generated.json'), {
    screenshotChanges: [{
      id: 'home',
      screenshot,
      previous: 'predecessor-image-hash',
      current: null,
      reason: 'missing-current-image',
    }],
  });
  const target = path.join(root, screenshot);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, 'predecessor image');

  await run('apply-screenshot-removals.mjs', root);

  await assert.rejects(readFile(target), { code: 'ENOENT' });

  await writeFile(target, 'restored predecessor image');
  await jsonFile(path.join(root, 'docs/documentation-system/ui-change-report.generated.json'), {
    screenshotChanges: [{
      id: 'home',
      screenshot: '../../README.md',
      previous: 'predecessor-image-hash',
      current: null,
    }],
  });
  await assert.rejects(run('apply-screenshot-removals.mjs', root));
  assert.equal(await readFile(target, 'utf8'), 'restored predecessor image');
});

test('publication preserves retired paths reassigned to a current screen', async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const screenshot = 'docs/screenshots/current/reused.png';
  await jsonFile(path.join(root, 'docs/documentation-system/screen-manifest.json'), {
    screens: [{ id: 'replacement', screenshot }],
  });
  await jsonFile(path.join(root, 'docs/documentation-system/ui-change-report.generated.json'), {
    screenshotEvidence: {
      replacement: {
        status: 'current',
        sourceRevision: 'current-head',
        screenshot,
        sha256: 'replacement-image-hash',
      },
    },
    screenshotChanges: [{
      id: 'retired',
      screenshot,
      previous: 'predecessor-image-hash',
      current: null,
      reason: 'removed-screen-registration',
    }],
  });
  const target = path.join(root, screenshot);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, 'accepted replacement image');

  await run('apply-screenshot-removals.mjs', root);

  assert.equal(await readFile(target, 'utf8'), 'accepted replacement image');
});

test('source-only runs label matching screenshots as predecessor evidence', async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const screenshot = 'docs/screenshots/current/home.png';
  const screenshotBytes = Buffer.from('accepted predecessor image');
  const { createHash } = await import('node:crypto');
  const screenshotHash = createHash('sha256').update(screenshotBytes).digest('hex');
  await jsonFile(path.join(root, 'docs/documentation-system/screen-manifest.json'), {
    screens: [{
      id: 'home',
      surface: 'mobile',
      route: '/',
      source: 'apps/mobile/app/index.tsx',
      screenshot,
    }],
  });
  await jsonFile(path.join(root, 'docs/documentation-system/current-baseline.json'), {
    sourceRevision: 'baseline-head',
    screenshotSourceRevision: 'screenshot-head',
    sources: {},
    screenshots: { home: screenshotHash },
  });
  await jsonFile(path.join(root, 'docs/documentation-system/ui-fingerprint.generated.json'), {
    sourceRevision: 'current-head',
    sources: {},
  });
  const target = path.join(root, screenshot);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, screenshotBytes);

  await run('compare-and-plan.mjs', root, {
    GITHUB_SHA: 'current-head',
    DOCS_SYNC_UPDATE_BASELINE: '1',
  });
  await run('regenerate-manual-index.mjs', root);

  const report = JSON.parse(await readFile(
    path.join(root, 'docs/documentation-system/ui-change-report.generated.json'),
    'utf8',
  ));
  const baseline = JSON.parse(await readFile(
    path.join(root, 'docs/documentation-system/current-baseline.json'),
    'utf8',
  ));
  const manual = await readFile(
    path.join(root, 'docs/manuals/generated/ui-interface-baseline.md'),
    'utf8',
  );
  assert.deepEqual(report.screenshotEvidence.home, {
    status: 'predecessor',
    sourceRevision: 'screenshot-head',
    screenshot,
    sha256: screenshotHash,
  });
  assert.equal(baseline.sourceRevision, 'current-head');
  assert.equal(baseline.screenshotSourceRevision, 'screenshot-head');
  assert.equal(baseline.screenshots.home, screenshotHash);
  assert.match(manual, /Screenshot evidence: predecessor revision `screenshot-head`/);
  assert.doesNotMatch(manual, /home current interface/);
});

test('source-only runs prune screenshots for removed manifest entries', async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const screenshot = 'docs/screenshots/current/obsolete.png';
  await jsonFile(path.join(root, 'docs/documentation-system/screen-manifest.json'), { screens: [] });
  await jsonFile(path.join(root, 'docs/documentation-system/current-baseline.json'), {
    sourceRevision: 'baseline-head',
    screenshotSourceRevision: 'screenshot-head',
    sources: {},
    screenshots: { obsolete: 'predecessor-image-hash' },
    screenshotPaths: { obsolete: screenshot },
  });
  await jsonFile(path.join(root, 'docs/documentation-system/ui-fingerprint.generated.json'), {
    sourceRevision: 'current-head',
    sources: {},
  });
  const target = path.join(root, screenshot);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, 'obsolete predecessor image');

  await run('compare-and-plan.mjs', root, {
    GITHUB_SHA: 'current-head',
    DOCS_SYNC_UPDATE_BASELINE: '1',
  });
  await run('apply-screenshot-removals.mjs', root);

  const report = JSON.parse(await readFile(
    path.join(root, 'docs/documentation-system/ui-change-report.generated.json'),
    'utf8',
  ));
  const baseline = JSON.parse(await readFile(
    path.join(root, 'docs/documentation-system/current-baseline.json'),
    'utf8',
  ));
  assert.deepEqual(report.screenshotChanges, [{
    id: 'obsolete',
    screenshot,
    previous: 'predecessor-image-hash',
    current: null,
    reason: 'removed-screen-registration',
  }]);
  assert.deepEqual(baseline.screenshots, {});
  assert.deepEqual(baseline.screenshotPaths, {});
  await assert.rejects(readFile(target), { code: 'ENOENT' });
});

test('capture dependencies run outside the repository-write publication job', async () => {
  const workflow = await readFile(
    path.join(repositoryRoot, '.github/workflows/docs-interface-sync.yml'),
    'utf8',
  );
  const captureStart = workflow.indexOf('  capture-on-main:');
  const publishStart = workflow.indexOf('  sync-on-main:');
  assert.notEqual(captureStart, -1);
  assert.ok(publishStart > captureStart);
  const captureJob = workflow.slice(captureStart, publishStart);
  const publishJob = workflow.slice(publishStart);
  assert.match(captureJob, /permissions:\n\s+contents: read/);
  assert.match(captureJob, /npm install --prefix tools\/docs-sync/);
  assert.match(captureJob, /DOCS_CAPTURE_REVISION_URL/);
  assert.match(publishJob, /needs: capture-on-main/);
  assert.match(publishJob, /persist-credentials: false/);
  assert.match(publishJob, /apply-screenshot-removals\.mjs/);
  assert.doesNotMatch(publishJob, /npm install|playwright install|node tools\/docs-sync\/src\/capture/);
  assert.match(publishJob, /GH_TOKEN: \$\{\{ github\.token \}\}/);
});

test('README documents report-based runtime-capture review signaling', async () => {
  const readme = await readFile(path.join(repositoryRoot, 'tools/docs-sync/README.md'), 'utf8');
  assert.match(
    readme,
    /exits successfully after writing the capture report.*route or text-anchor review signal/s,
  );
  assert.match(readme, /DOCS_CAPTURE_EXPECTED_REVISION=.*DOCS_CAPTURE_REVISION_URL=.*npm run capture/s);
});
