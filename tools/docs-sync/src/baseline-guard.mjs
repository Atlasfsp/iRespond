import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const baselinePath = 'docs/documentation-system/current-baseline.json';
const publicationBranchPattern = /^docs-sync\/[0-9a-f]{12}-[1-9][0-9]*$/;

export function validateBaselineOwnership({
  baselineChanged,
  acceptedBaselineExists,
  headRef,
  pullRequestAuthor,
  sameRepository = false,
}) {
  if (!baselineChanged || !acceptedBaselineExists) return;
  const publicationOwned = pullRequestAuthor === 'github-actions[bot]'
    && publicationBranchPattern.test(headRef || '')
    && sameRepository;
  if (!publicationOwned) {
    throw new Error(
      `Only a github-actions[bot] ${publicationBranchPattern} publication PR may change the accepted baseline.`,
    );
  }
}

async function gitExitCode(args, cwd) {
  try {
    await execFileAsync('git', args, { cwd });
    return 0;
  } catch (error) {
    if (Number.isInteger(error?.code)) return error.code;
    throw error;
  }
}

async function main() {
  const root = path.resolve(process.argv[2] || '.');
  const acceptedRevision = process.env.DOCS_SYNC_ACCEPTED_REVISION || '';
  const headRevision = process.env.DOCS_SYNC_HEAD_SHA || 'HEAD';
  if (!/^[0-9a-f]{40}$/.test(acceptedRevision)) {
    throw new Error('DOCS_SYNC_ACCEPTED_REVISION must be an exact 40-character Git SHA.');
  }
  if (headRevision !== 'HEAD' && !/^[0-9a-f]{40}$/.test(headRevision)) {
    throw new Error('DOCS_SYNC_HEAD_SHA must be an exact 40-character Git SHA.');
  }

  const acceptedBaselineExists = await gitExitCode(
    ['cat-file', '-e', `${acceptedRevision}:${baselinePath}`],
    root,
  ) === 0;
  let baselineChanged = true;
  if (acceptedBaselineExists) {
    const diffExit = await gitExitCode(
      ['diff', '--quiet', `${acceptedRevision}...${headRevision}`, '--', baselinePath],
      root,
    );
    if (diffExit !== 0 && diffExit !== 1) {
      throw new Error(`Unable to compare the accepted baseline (git diff exit ${diffExit}).`);
    }
    baselineChanged = diffExit === 1;
  }

  validateBaselineOwnership({
    baselineChanged,
    acceptedBaselineExists,
    headRef: process.env.DOCS_SYNC_HEAD_REF || '',
    pullRequestAuthor: process.env.DOCS_SYNC_PR_AUTHOR || '',
    sameRepository: process.env.DOCS_SYNC_HEAD_REPOSITORY === process.env.GITHUB_REPOSITORY,
  });
  console.log(JSON.stringify({ acceptedRevision, headRevision, acceptedBaselineExists, baselineChanged }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
