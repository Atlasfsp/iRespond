import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
test('runner scheduler probe uses only the isolated Linux runner and no credentials',()=>{
 const s=readFileSync('.github/workflows/mac-runner-smoke.yml','utf8');
 assert.match(s,/runs-on: \[self-hosted, Linux, ARM64, irespond-isolated\]/);
 assert.match(s,/permissions: \{\}/);
 assert.match(s,/github.event_name == 'push'/);
 assert.match(s,/github.ref == 'refs\/heads\/codex\/fieldwork-release-completion'/);
 assert.doesNotMatch(s,/pull_request_target|actions\/checkout|secrets\.|ubuntu-latest|macos-/);
});
import {readdirSync} from 'node:fs';
test('release workflows retain trusted-source gates and never select paid hosted runners',()=>{
 for(const file of readdirSync('.github/workflows').filter(x=>x.endsWith('.yml')&&x!=='mac-runner-smoke.yml')){
  const s=readFileSync(`.github/workflows/${file}`,'utf8');
  assert.doesNotMatch(s,/runs-on: (ubuntu|macos|windows)-/);
  assert.match(s,/github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(s,/github\.event\.pull_request\.number == 71/);
  assert.match(s,/runs-on: \$\{\{ fromJSON/);
  assert.match(s,/irespond-untrusted-disabled/);
  assert.doesNotMatch(s,/^    if: github\.repository/m,'untrusted required jobs must remain pending, not skipped-green');
 }
});
test('isolated release jobs do not depend on the remote cache service',()=>{
 for(const file of ['verify.yml','build-android-demo.yml','living-manuals.yml']){
  const s=readFileSync(`.github/workflows/${file}`,'utf8');
  assert.doesNotMatch(s,/cache: pnpm|cache-dependency-path:/);
 }
 const verify=readFileSync('.github/workflows/verify.yml','utf8');
 assert.equal((verify.match(/cache: false/g)||[]).length,2,'both Go lanes disable default remote caching');
});
