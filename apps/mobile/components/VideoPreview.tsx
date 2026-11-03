import {useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {useVideoPlayer,VideoView} from 'expo-video';

export function VideoPreview({uri}:{uri:string}){
 const [error,setError]=useState('');
 const local=/^(file:|content:|blob:|data:video\/)/i.test(uri);
 const player=useVideoPlayer(local?uri:null);
 useEffect(()=>{const listener=player.addListener('statusChange',event=>setError(event.status==='error'?'This video could not be decoded on this device. Choose a supported recording or remove it.':''));return()=>listener.remove()},[player]);
 if(!local)return <Text accessibilityRole="alert">Only locally attached video can be previewed.</Text>;
 return <View>{error?<Text accessibilityRole="alert">{error}</Text>:<VideoView player={player} nativeControls style={{width:'100%',height:220}}/>}<Text>Video preview stays inside iRespond. Playback does not verify the recording.</Text></View>;
}
