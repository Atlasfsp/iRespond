import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
test('pnpm 10 security policy and Metro patch live in workspace configuration', () => {
 const pkg=JSON.parse(readFileSync('package.json','utf8'));
 const workspace=readFileSync('pnpm-workspace.yaml','utf8');
 assert.equal(pkg.pnpm,undefined,'workspace must be the single policy source');
 assert.match(workspace,/overrides:/);
 assert.match(workspace,/patchedDependencies:/);
 assert.match(workspace,/patches\/metro@0\.82\.5\.patch/);
 assert.doesNotMatch(workspace,/ignoreCves|ignoreGhsas/,'no blanket advisory suppression');
});
