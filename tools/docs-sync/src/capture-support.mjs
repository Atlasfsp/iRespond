import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

function revisionFromBody(body) {
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed.sourceRevision
      || parsed.gitSha
      || parsed.sha
      || parsed.version?.gitSha
      || parsed.version?.sha
      || null;
  } catch {
    return trimmed;
  }
}

export async function verifyPreviewRevision(revisionURL, expectedRevision, fetchImpl = globalThis.fetch) {
  if (!revisionURL) {
    return { verified: false, observedRevision: null, error: 'A preview revision URL is required.' };
  }
  if (!expectedRevision) {
    return { verified: false, observedRevision: null, error: 'An expected source revision is required.' };
  }
  try {
    const response = await fetchImpl(revisionURL, { headers: { Accept: 'application/json, text/plain' } });
    if (!response.ok) {
      return {
        verified: false,
        observedRevision: null,
        error: `Preview revision endpoint returned HTTP ${response.status}.`,
      };
    }
    const observedRevision = revisionFromBody(await response.text());
    if (observedRevision !== expectedRevision) {
      return {
        verified: false,
        observedRevision,
        error: `Preview revision ${observedRevision || 'unavailable'} does not match expected revision ${expectedRevision}.`,
      };
    }
    return { verified: true, observedRevision, error: null };
  } catch (error) {
    return { verified: false, observedRevision: null, error: `Preview revision check failed: ${String(error)}` };
  }
}

export async function confirmPreviewRevision(
  revisionURL,
  expectedRevision,
  before,
  fetchImpl = globalThis.fetch,
) {
  if (!before?.verified) {
    return {
      verified: false,
      beforeObservedRevision: before?.observedRevision || null,
      afterObservedRevision: null,
      error: before?.error || 'Preview revision was not verified before capture.',
    };
  }
  const after = await verifyPreviewRevision(revisionURL, expectedRevision, fetchImpl);
  if (!after.verified) {
    return {
      verified: false,
      beforeObservedRevision: before.observedRevision,
      afterObservedRevision: after.observedRevision,
      error: `Preview revision changed during capture. ${after.error}`,
    };
  }
  return {
    verified: true,
    beforeObservedRevision: before.observedRevision,
    afterObservedRevision: after.observedRevision,
    error: null,
  };
}

export async function resetCaptureTarget(target) {
  await mkdir(path.dirname(target), { recursive: true });
  await rm(target, { force: true });
}
