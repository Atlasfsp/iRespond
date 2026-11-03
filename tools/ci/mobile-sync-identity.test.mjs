import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
test('mobile offline sync sends verified identity for observation attribution',()=>{
 execFileSync(process.execPath,['--experimental-vm-modules','tools/ci/mobile-sync-identity.fixture.mjs'],{stdio:'pipe'});
});
