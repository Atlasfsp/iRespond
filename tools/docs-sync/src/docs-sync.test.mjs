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
    sourceRevision: 'current-head',
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
  assert.match(publishJob, /needs: capture-on-main/);
  assert.match(publishJob, /persist-credentials: false/);
  assert.doesNotMatch(publishJob, /npm install|playwright install|node tools\/docs-sync\/src\/capture/);
  assert.match(publishJob, /GH_TOKEN: \$\{\{ github\.token \}\}/);
});

test('README documents report-based runtime-capture review signaling', async () => {
  const readme = await readFile(path.join(repositoryRoot, 'tools/docs-sync/README.md'), 'utf8');
  assert.match(
    readme,
    /exits successfully after writing the capture report.*route or text-anchor review signal/s,
  );
});
