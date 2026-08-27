import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const manifest = JSON.parse(await readFile(path.join(root, 'docs/documentation-system/screen-manifest.json'), 'utf8'));
const files = [...new Set([
  ...manifest.screens.map((s) => s.source),
  'apps/mobile/app/_layout.tsx',
  'apps/mobile/lib/session.ts',
  'apps/mobile/lib/drafts.ts',
  'apps/mobile/lib/sync.ts',
  'apps/mobile/app.json',
  'apps/mobile/package.json'
])].sort();

function gitBlobId(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`);
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

const sourceHashes = {};
const aggregate = createHash('sha256');
for (const rel of files) {
  const bytes = await readFile(path.join(root, rel));
  const digest = gitBlobId(bytes);
  sourceHashes[rel] = digest;
  aggregate.update(rel).update('\0').update(digest).update('\0');
}

const out = {
  schema: 'irespond.documentation-ui-fingerprint.v1',
  sourceRevision: process.env.GITHUB_SHA || 'local',
  hashModel: 'git-blob-sha1-per-source + sha256-aggregate',
  aggregate: aggregate.digest('hex'),
  sources: sourceHashes
};
const target = path.join(root, 'docs/documentation-system/ui-fingerprint.generated.json');
await writeFile(target, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out));
