import {test} from 'node:test';
import assert from 'node:assert/strict';
import {directionsLinks, resolveCategory, validateMediaSelection} from '../../apps/web/field-report-policy.mjs';
test('map destinations use validated coordinates, including zero, without sending a title or origin',()=>{
 const links=directionsLinks(0,-3.456789);
 const google=new URL(links.google),apple=new URL(links.apple);
 assert.equal(google.searchParams.get('api'),'1');assert.equal(google.searchParams.get('destination'),'0,-3.456789');
 assert.equal(apple.searchParams.get('daddr'),'0,-3.456789');assert.equal(google.searchParams.has('origin'),false);
 for(const pair of [[true,0],[[1],2],[null,0],['',3],[NaN,1],[91,0],[1,181],['1&api=x',1]])assert.equal(directionsLinks(...pair),null);
});
test('Other requires a bounded description and preserves custom category text',()=>{
 assert.throws(()=>resolveCategory('other','  '));assert.throws(()=>resolveCategory('other','x'.repeat(121)));
 assert.deepEqual(resolveCategory('other','  Wildlife rescue  '),{category:'other',categoryDetail:'Wildlife rescue'});
 assert.deepEqual(resolveCategory('health','ignored'),{category:'health',categoryDetail:''});
});
test('four photos and one short video are bounded by bytes and duration; legacy attachments count',()=>{
 const photo={kind:'photo',sizeBytes:1000};const video={kind:'video',sizeBytes:1000,durationSeconds:30};
 assert.equal(validateMediaSelection([photo,photo,photo,photo,video]),'');
 assert.match(validateMediaSelection([photo,photo,photo,photo,photo]),/4 photos/);
 assert.match(validateMediaSelection([video,video]),/1 video/);
 assert.match(validateMediaSelection([{...video,durationSeconds:31}]),/30 seconds/);
 assert.match(validateMediaSelection([{...photo,sizeBytes:11*1024*1024}]),/10 MB/);
 assert.match(validateMediaSelection([{...video,sizeBytes:26*1024*1024}]),/25 MB/);
 assert.match(validateMediaSelection([{...video,durationSeconds:undefined}]),/duration/);
});
