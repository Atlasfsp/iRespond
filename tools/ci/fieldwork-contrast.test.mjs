import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
function lum(hex){const c=hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722}
function contrast(a,b){const [x,y]=[lum(a),lum(b)].sort((a,b)=>b-a);return (x+.05)/(y+.05)}
test('FIELDWORK semantic text palette meets WCAG AA on intended surfaces',()=>{
 for(const [fg,bg] of [['18352A','F8F7F1'],['205C45','FFFFFF'],['A3432B','EDF1E2'],['53685C','FFFFFF']])assert.ok(contrast(fg,bg)>=4.5,`${fg} on ${bg}`);
 const css=readFileSync('apps/web/fieldwork.css','utf8');
 assert.match(css,/--fw-coral-text:#A3432B/);
 assert.doesNotMatch(css,/color:var\(--fw-coral\)/,'decorative coral must not be used for text');
});
