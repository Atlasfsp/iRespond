import test from 'node:test';
import assert from 'node:assert/strict';
import {Stitch} from '../../apps/mobile/lib/stitch-theme.ts';
import {Fieldwork} from '../../apps/mobile/lib/fieldwork-theme.ts';
test('all canonical native screens inherit FIELDWORK semantic colors',()=>{
 assert.equal(Stitch.color.background,Fieldwork.color.canvas);
 assert.equal(Stitch.color.primary,Fieldwork.color.leaf);
 assert.equal(Stitch.color.onSurface,Fieldwork.color.ink);
 assert.equal(Stitch.color.error,Fieldwork.color.disputed);
 assert.ok(Stitch.control.minHeight>=44);
});
