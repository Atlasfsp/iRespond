// Shared presentation policy. The API independently validates every write.
export function directionsLinks(latitude, longitude) {
 if(!['number','string'].includes(typeof latitude)||!['number','string'].includes(typeof longitude))return null;
 if (latitude == null || longitude == null || String(latitude).trim()==='' || String(longitude).trim()==='') return null;
 const lat=Number(latitude),lng=Number(longitude);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return null;
 const destination=encodeURIComponent(`${lat},${lng}`);
 return {google:`https://www.google.com/maps/dir/?api=1&destination=${destination}`,apple:`https://maps.apple.com/?daddr=${destination}`};
}
export function resolveCategory(category, detail='') {
 const value=String(category||'community').trim().toLowerCase();
 const text=value==='other'?String(detail).trim():'';
 if(value==='other'&&(!text||text.length>120))throw new Error('Describe the other area of impact in 1–120 characters.');
 return {category:value,categoryDetail:text};
}
export function validateMediaSelection(items) {
 if(items.filter(x=>x.kind!=='video').length>4)return 'Attach at most 4 photos.';
 if(items.filter(x=>x.kind==='video').length>1)return 'Attach at most 1 video.';
 for(const item of items){
  const video=item.kind==='video';
  if(item.sizeBytes!==undefined&&(!Number.isFinite(item.sizeBytes)||item.sizeBytes<=0||item.sizeBytes>(video?25:10)*1024*1024))return video?'Video must be at most 25 MB.':'Each photo must be at most 10 MB.';
  if(video&&(!Number.isFinite(item.durationSeconds)||item.durationSeconds<=0))return 'Video duration could not be checked; choose another recording.';
  if(video&&item.durationSeconds>30)return 'Video must be at most 30 seconds.';
 }
 return '';
}
