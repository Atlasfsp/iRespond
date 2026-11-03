import {useState} from 'react';
import {Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {directionsLinks} from '../../web/field-report-policy.mjs';
import {Stitch} from '../lib/stitch-theme';

export function Directions({latitude,longitude,known}:{latitude?:number;longitude?:number;known?:boolean}) {
 const [error,setError]=useState('');const links=known===false?null:directionsLinks(latitude,longitude);
 if(!links)return <Text accessibilityRole="alert">Directions unavailable: this report has no valid destination coordinates.</Text>;
 async function open(url:string){setError('');try{await Linking.openURL(url)}catch{setError('Maps could not open. Try the other provider or use the coordinates shown above.')}}
 return <View style={s.box}><Text style={s.title}>Directions to intervention</Text><Text style={s.body}>Open your preferred maps app or its website. Only the destination is shared after you choose a provider. Check the reported location and travel safely.</Text><View style={s.row}>{(['google','apple'] as const).map(provider=><Pressable key={provider} accessibilityRole="link" accessibilityLabel={`Get directions with ${provider==='google'?'Google Maps':'Apple Maps'}`} style={s.button} onPress={()=>void open(links![provider])}><Text style={s.label}>{provider==='google'?'Google Maps':'Apple Maps'}</Text></Pressable>)}</View>{!!error&&<Text accessibilityRole="alert" style={s.body}>{error}</Text>}</View>;
}
const s=StyleSheet.create({box:{gap:10,padding:16,borderRadius:16,borderWidth:1,borderColor:Stitch.color.outlineVariant},title:{...Stitch.type.card,color:Stitch.color.primary},body:{...Stitch.type.body,color:Stitch.color.onSurfaceVariant},row:{flexDirection:'row',flexWrap:'wrap',gap:10},button:{minHeight:48,justifyContent:'center',padding:12,borderRadius:12,backgroundColor:Stitch.color.primaryContainer},label:{...Stitch.type.bodyBold,color:Stitch.color.onPrimary}});
