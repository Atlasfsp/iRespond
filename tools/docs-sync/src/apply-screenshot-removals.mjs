import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const manifest = JSON.parse(await readFile(
  path.join(root, 'docs/documentation-system/screen-manifest.json'),
  'utf8',
));
const report = JSON.parse(await readFile(
  path.join(root, 'docs/documentation-system/ui-change-report.generated.json'),
  'utf8',
));
const registered = new Map(manifest.screens.map((screen) => [screen.id, screen.screenshot]));
const screenshotRoot = path.resolve(root, 'docs/screenshots/current');
const removed = [];
const retiredReasons = new Set(['removed-screen-registration', 'moved-screen-screenshot']);

for (const change of report.screenshotChanges || []) {
  if (change.current !== null) continue;
  const registeredPath = registered.get(change.id);
  if (registeredPath !== change.screenshot && !retiredReasons.has(change.reason)) {
    throw new Error(`Refusing unregistered screenshot removal for ${change.id || 'unknown'}.`);
  }
  const target = path.resolve(root, change.screenshot);
  if (target !== screenshotRoot && !target.startsWith(`${screenshotRoot}${path.sep}`)) {
    throw new Error(`Refusing screenshot removal outside ${screenshotRoot}.`);
  }
  await rm(target, { force: true });
  removed.push(change.screenshot);
}

console.log(JSON.stringify({ removed }));
