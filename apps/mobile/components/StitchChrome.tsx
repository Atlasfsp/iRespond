import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoMode } from '../lib/demo-backend';
import { Stitch } from '../lib/stitch-theme';
import { Fieldwork } from '../lib/fieldwork-theme';
type TopBarProps={title?:string;showBack?:boolean;showNotifications?:boolean;showCatalog?:boolean};
export function StitchTopBar({title='iRespond',showBack=false,showNotifications=true,showCatalog=true}:TopBarProps){return <View><View style={s.topBar}><View style={s.brandGroup}>{showBack?<Pressable style={s.iconButton} onPress={()=>router.back()} accessibilityLabel="Go back" accessibilityRole="button"><Ionicons name="arrow-back" size={22} color={Stitch.color.primary}/></Pressable>:<View style={s.avatar}><Text style={s.avatarText}>iR</Text></View>}<Text style={s.brand} numberOfLines={1}>{title}</Text></View><View style={s.rightActions}>{showCatalog&&<Pressable style={s.iconButton} onPress={()=>router.push('/catalog')} accessibilityLabel="Open iRespond surfaces" accessibilityRole="button"><Ionicons name="grid-outline" size={22} color={Stitch.color.primary}/></Pressable>}{showNotifications&&<Pressable style={s.iconButton} onPress={()=>router.push('/notifications')} accessibilityLabel="Notifications" accessibilityRole="button"><Ionicons name="notifications-outline" size={24} color={Stitch.color.primary}/></Pressable>}</View></View>{demoMode&&<View style={s.demoBanner} accessibilityRole="text"><Ionicons name="flask-outline" size={16} color={Stitch.color.primary}/><Text style={s.demoText}>OFFLINE DEMO · local sample data · no production actions or authority</Text></View>}</View>}
const tabs=[{label:'Home',route:'/',icon:'compass-outline' as const},{label:'Actions',route:'/workspace',icon:'checkmark-circle-outline' as const},{label:'Report',route:'/report',icon:'add-circle-outline' as const},{label:'Impact',route:'/impact',icon:'ribbon-outline' as const},{label:'Profile',route:'/profile',icon:'person-outline' as const}];
export function StitchBottomNav(){const pathname=usePathname();return <SafeAreaView edges={['bottom']} style={s.bottomNav}>{tabs.map((tab)=>{const active=tab.route==='/'?pathname==='/':pathname.startsWith(tab.route);return <Pressable key={tab.label} style={s.tab} onPress={()=>router.push(tab.route as never)} accessibilityLabel={tab.label} accessibilityRole="button" accessibilityState={{selected:active}}><View style={[s.tabIcon,active&&s.tabIconActive]}><Ionicons name={tab.icon} size={24} color={active?Fieldwork.color.leaf:Stitch.color.onSurfaceVariant}/></View><Text style={[s.tabLabel,active&&s.tabLabelActive]}>{tab.label}</Text></Pressable>})}</SafeAreaView>}
const s=StyleSheet.create({
 topBar:{minHeight:68,paddingHorizontal:Stitch.space.screen,paddingVertical:Stitch.space.sm,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:Fieldwork.color.border,backgroundColor:'#FFFFFF'},
 demoBanner:{minHeight:32,paddingHorizontal:Stitch.space.screen,paddingVertical:7,backgroundColor:Stitch.color.tertiaryFixed,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
 demoText:{flex:1,flexShrink:1,...Stitch.type.footnote,color:Stitch.color.primary,fontWeight:'900',textAlign:'center'},
 brandGroup:{flexDirection:'row',alignItems:'center',gap:11,flex:1,minWidth:0},
 avatar:{width:40,height:40,borderRadius:13,backgroundColor:Fieldwork.color.inkStrong,alignItems:'center',justifyContent:'center'},
 avatarText:{color:'#E8F5DC',fontWeight:'900',fontSize:14},
 brand:{color:Fieldwork.color.inkStrong,...Stitch.type.section,fontWeight:'900',flexShrink:1,letterSpacing:-0.5},
 rightActions:{flexDirection:'row',alignItems:'center',gap:3},
 iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:14,backgroundColor:Fieldwork.color.leafSoft},
 bottomNav:{minHeight:76,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:6,paddingBottom:Stitch.space.xs,backgroundColor:'#FFFFFF',borderTopWidth:1,borderTopColor:Fieldwork.color.border},
 tab:{minWidth:60,minHeight:62,alignItems:'center',justifyContent:'center',gap:3},
 tabIcon:{width:48,height:35,alignItems:'center',justifyContent:'center',borderRadius:14},
 tabIconActive:{backgroundColor:Fieldwork.color.leafSoft},
 tabLabel:{...Stitch.type.footnote,color:'#5B6B72',fontSize:10},
 tabLabelActive:{color:Fieldwork.color.leaf,fontWeight:'900'}
});
