import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
test('demo and connected mobile API destinations remain isolated',()=>{execFileSync(process.execPath,['--experimental-vm-modules','tools/ci/mobile-environment.fixture.mjs'],{stdio:'pipe'})});
