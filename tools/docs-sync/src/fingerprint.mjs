import { createHash } from 'node:crypto';
import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { validateScreenManifest } from './manifest-support.mjs';

const root = path.resolve(process.argv[2] || '.');
const manifest = JSON.parse(await readFile(path.join(root, 'docs/documentation-system/screen-manifest.json'), 'utf8'));
validateScreenManifest(manifest);
const trackedRoots = manifest.trackedFrontendRoots || ['apps/mobile', 'apps/web'];
const uiExtensions = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.html',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.heic',
  '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp4', '.webm', '.mov',
]);

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

async function walk(relativeRoot) {
  const absoluteRoot = path.join(root, relativeRoot);
  if (!await exists(absoluteRoot)) return [];
  const out = [];
  async function visit(absoluteDir, relativeDir) {
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.expo')) continue;
      const absolute = path.join(absoluteDir, entry.name);
      const relative = path.posix.join(relativeDir.replaceAll('\\', '/'), entry.name);
      if (entry.isDirectory()) await visit(absolute, relative);
      else if (uiExtensions.has(path.extname(entry.name).toLowerCase())) out.push(relative);
    }
  }
  await visit(absoluteRoot, relativeRoot);
  return out;
}

const discovered = [];
for (const trackedRoot of trackedRoots) discovered.push(...await walk(trackedRoot));
const files = [...new Set([
  ...discovered,
  ...manifest.screens.map((screen) => screen.source),
])].filter(Boolean).sort();

const synchronizationContractCandidates = [
  '.github/workflows/docs-baseline-ownership.yml',
  '.github/workflows/docs-interface-sync.yml',
  'docs/documentation-system/screen-manifest.json',
  'tools/docs-sync/package.json',
  ...(await walk('tools/docs-sync/src')).filter((file) => !file.endsWith('.test.mjs')),
];
const synchronizationContractFiles = [];
for (const file of [...new Set(synchronizationContractCandidates)].sort()) {
  if (await exists(path.join(root, file))) synchronizationContractFiles.push(file);
}

function gitBlobId(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`);
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

const sourceHashes = {};
const aggregate = createHash('sha256');
for (const rel of files) {
  const absolute = path.join(root, rel);
  if (!await exists(absolute)) continue;
  const bytes = await readFile(absolute);
  const digest = gitBlobId(bytes);
  sourceHashes[rel] = digest;
  aggregate.update(rel).update('\0').update(digest).update('\0');
}

const synchronizationContract = {};
const synchronizationContractAggregate = createHash('sha256');
for (const rel of synchronizationContractFiles) {
  const bytes = await readFile(path.join(root, rel));
  const digest = gitBlobId(bytes);
  synchronizationContract[rel] = digest;
  synchronizationContractAggregate.update(rel).update('\0').update(digest).update('\0');
}

const out = {
  schema: 'irespond.documentation-ui-fingerprint.v2',
  sourceRevision: process.env.GITHUB_SHA || 'local',
  hashModel: 'git-blob-sha1-per-source + sha256-aggregate',
  trackedFrontendRoots: trackedRoots,
  aggregate: aggregate.digest('hex'),
  sources: sourceHashes,
  synchronizationContractAggregate: synchronizationContractAggregate.digest('hex'),
  synchronizationContract,
};
const target = path.join(root, 'docs/documentation-system/ui-fingerprint.generated.json');
await writeFile(target, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out));
