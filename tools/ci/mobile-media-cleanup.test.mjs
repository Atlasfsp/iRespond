import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
test('private evidence cleanup cannot delete outside owned copies',()=>{execFileSync(process.execPath,['--experimental-vm-modules','tools/ci/mobile-media-cleanup.fixture.mjs'],{stdio:'pipe'})});
