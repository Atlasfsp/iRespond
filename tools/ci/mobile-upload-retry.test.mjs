import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
test('mobile media retries bind bytes and preserve the queue on quota failure',()=>{execFileSync(process.execPath,['--experimental-vm-modules','tools/ci/mobile-upload-retry.fixture.mjs'],{stdio:'pipe'})});
