import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stitch } from '../lib/stitch-theme';

type TopBarProps = { title?: string; showBack?: boolean; showNotifications?: boolean };
export function StitchTopBar({ title = 'iRespond', showBack = false, showNotifications = true }: TopBarProps) {
  return <View style={s.topBar}>
    <View style={s.brandGroup}>
      {showBack ? <Pressable style={s.iconButton} onPress={() => router.back()} accessibilityLabel="Back"><Ionicons name="arrow-back" size={22} color={Stitch.color.primary} /></Pressable> : <View style={s.avatar}><Text style={s.avatarText}>iR</Text></View>}
      <Text style={s.brand}>{title}</Text>
    </View>
    {showNotifications && <Pressable style={s.iconButton} onPress={() => router.push('/notifications')} accessibilityLabel="Notifications"><Ionicons name="notifications-outline" size={24} color={Stitch.color.primary} /></Pressable>}
  </View>;
}

const tabs = [
  { label: 'Home', route: '/', icon: 'compass-outline' as const },
  { label: 'Actions', route: '/workspace', icon: 'checkmark-circle-outline' as const },
  { label: 'Report', route: '/report', icon: 'add-circle-outline' as const },
  { label: 'Impact', route: '/impact', icon: 'ribbon-outline' as const },
  { label: 'Profile', route: '/profile', icon: 'person-outline' as const }
];

export function StitchBottomNav() {
  const pathname = usePathname();
  return <View style={s.bottomNav}>{tabs.map((tab) => {
    const active = tab.route === '/' ? pathname === '/' : pathname.startsWith(tab.route);
    return <Pressable key={tab.label} style={s.tab} onPress={() => router.push(tab.route as never)} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <View style={[s.tabIcon, active && s.tabIconActive]}><Ionicons name={tab.icon} size={24} color={active ? Stitch.color.primaryFixed : Stitch.color.onSurfaceVariant} /></View>
      <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
    </Pressable>;
  })}</View>;
}

const s = StyleSheet.create({
  topBar: { minHeight: 64, paddingHorizontal: Stitch.space.screen, paddingVertical: Stitch.space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Stitch.color.outlineVariant, backgroundColor: Stitch.color.surface },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: Stitch.space.md, flex: 1 },
  avatar: { width: 34, height: 34, borderRadius: Stitch.radius.full, backgroundColor: Stitch.color.primaryContainer, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Stitch.color.outlineVariant },
  avatarText: { color: Stitch.color.onPrimary, fontWeight: '900', fontSize: 12 },
  brand: { color: Stitch.color.primary, ...Stitch.type.section, fontWeight: '900' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Stitch.radius.full },
  bottomNav: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: Stitch.space.sm, paddingBottom: Stitch.space.xs, backgroundColor: Stitch.color.surfaceLowest, borderTopWidth: 1, borderTopColor: Stitch.color.outlineVariant },
  tab: { minWidth: 60, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabIcon: { width: 44, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: Stitch.radius.full },
  tabIconActive: { backgroundColor: Stitch.color.primaryContainer },
  tabLabel: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant },
  tabLabelActive: { color: Stitch.color.primary, fontWeight: '800' }
});
