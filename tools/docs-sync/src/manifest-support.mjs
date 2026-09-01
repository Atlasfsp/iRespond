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
    const portableScreenshot = screen.screenshot.replaceAll('\\', '/');
    const normalizedScreenshot = path.posix.normalize(portableScreenshot);
    const repositoryRelativeScreenshot = normalizedScreenshot.replace(/^\/+/, '');
    const existingOwner = screenshotOwners.get(repositoryRelativeScreenshot);
    if (existingOwner) {
      throw new Error(
        `Duplicate screenshot target ${repositoryRelativeScreenshot}: ${existingOwner} and ${screen.id}.`,
      );
    }
    if (path.posix.isAbsolute(portableScreenshot)) {
      throw new Error(`Screenshot target for ${screen.id} must be repository-relative.`);
    }
    if (portableScreenshot !== repositoryRelativeScreenshot) {
      throw new Error(`Screenshot target for ${screen.id} must use its canonical repository-relative path.`);
    }
    if (!repositoryRelativeScreenshot.startsWith('docs/screenshots/current/')) {
      throw new Error(`Screenshot target for ${screen.id} must be under docs/screenshots/current/.`);
    }
    screenshotOwners.set(repositoryRelativeScreenshot, screen.id);
  }
}
