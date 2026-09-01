import path from 'node:path';

export function validateScreenManifest(manifest) {
  if (!Array.isArray(manifest?.screens)) {
    throw new Error('Screen manifest must contain a screens array.');
  }
  const ids = new Set();
  const screenshotOwners = new Map();
  for (const screen of manifest.screens) {
    if (typeof screen?.id !== 'string' || !screen.id) {
      throw new Error('Every registered screen must have a non-empty id.');
    }
    if (ids.has(screen.id)) throw new Error(`Duplicate screen id: ${screen.id}.`);
    ids.add(screen.id);
    if (typeof screen.screenshot !== 'string' || !screen.screenshot) {
      throw new Error(`Registered screen ${screen.id} must have a screenshot target.`);
    }
    const normalizedScreenshot = path.posix.normalize(screen.screenshot.replaceAll('\\', '/'));
    const existingOwner = screenshotOwners.get(normalizedScreenshot);
    if (existingOwner) {
      throw new Error(
        `Duplicate screenshot target ${normalizedScreenshot}: ${existingOwner} and ${screen.id}.`,
      );
    }
    screenshotOwners.set(normalizedScreenshot, screen.id);
  }
}
