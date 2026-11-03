import * as FileSystem from 'expo-file-system';
import {Platform} from 'react-native';
export type CaptureContext={origin:'camera'|'library'|'legacy';recordedAt:string;stage:'before'|'during'|'after';locationStatus:'captured'|'denied'|'unavailable';latitude?:number;longitude?:number;accuracyMeters?:number;durationSeconds?:number};
export type EvidenceAttachment={id:string;uri:string;kind:'photo'|'video';contentType?:string;sizeBytes?:number;captureContext?:CaptureContext};
export async function persistMedia(uri:string,id:string,video:boolean){
 if(!/^attachment-[0-9]+-[a-z0-9]+$/.test(id))throw new Error('Invalid private attachment identifier.');
 if(Platform.OS==='web'){
  const blob=await(await fetch(uri)).blob();
  const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Photo could not be retained in this browser.'));reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(blob)});
  return {uri:data,sizeBytes:blob.size,contentType:blob.type};
 }
 if(!FileSystem.documentDirectory)throw new Error('Private device storage is unavailable.');
 const folder=`${FileSystem.documentDirectory}report-evidence/`;await FileSystem.makeDirectoryAsync(folder,{intermediates:true});
 const extension=uri.split('?')[0].match(/\.(jpe?g|png|webp|mp4|mov)$/i)?.[0]||(video?'.mp4':'.jpg');
 const destination=`${folder}${id}${extension}`;await FileSystem.copyAsync({from:uri,to:destination});
 const info=await FileSystem.getInfoAsync(destination);if(!info.exists)throw new Error('Evidence could not be copied to private storage.');
 return {uri:destination,sizeBytes:info.size,contentType:undefined};
}

// Only app-owned copies can be discarded; never delete picker originals or other files.
export async function discardPrivateMedia(uri:string){
 if(Platform.OS==='web'||!FileSystem.documentDirectory)return;
 const folder=`${FileSystem.documentDirectory}report-evidence/`;
 if(!uri.startsWith(folder)||!/^attachment-[0-9]+-[a-z0-9]+\.(jpe?g|png|webp|mp4|mov)$/i.test(uri.slice(folder.length)))return;
 await FileSystem.deleteAsync(uri,{idempotent:true});
}
