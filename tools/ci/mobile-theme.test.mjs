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
import {readFileSync} from 'node:fs';
test('selected navigation icons remain visible against the selected surface',()=>{
 const chrome=readFileSync('apps/mobile/components/StitchChrome.tsx','utf8');
 assert.doesNotMatch(chrome,/active\?Stitch\.color\.primaryFixed/,'primaryFixed now equals the selected surface');
 assert.match(chrome,/active\?Fieldwork\.color\.leaf/);
});
test('bottom navigation owns the bottom safe area',()=>{
 const chrome=readFileSync('apps/mobile/components/StitchChrome.tsx','utf8');
 assert.match(chrome,/<SafeAreaView edges=\{\['bottom'\]\} style=\{s.bottomNav\}>/);
 const catalog=readFileSync('apps/mobile/app/catalog.tsx','utf8');
 assert.match(catalog,/<SafeAreaView style=\{s.safe\} edges=\{\['top','left','right'\]\}>/);
});
test('native demo banner text wraps inside its icon row',()=>{
 const chrome=readFileSync('apps/mobile/components/StitchChrome.tsx','utf8');
 const style=chrome.match(/demoText:\{([^}]+)\}/)?.[1]||'';
 assert.match(style,/flex:1/);
 assert.match(style,/flexShrink:1/);
});
