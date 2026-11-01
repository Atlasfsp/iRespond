import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { StitchBottomNav, StitchTopBar } from '../components/StitchChrome';
import { Stitch } from '../lib/stitch-theme';

type Need = {
  id: string;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  verificationState: string;
  sdgTags: number[];
};

type NeedFilter = 'all' | 'verified' | 'unverified';

export default function NeedMap() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [status, setStatus] = useState('Finding your location…');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<NeedFilter>('all');

  async function loadNearby() {
    setLoading(true);
    setNeeds([]); // Never present stale results as the current nearby response.
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus('Location permission is needed for nearby discovery. You can still report needs without granting it.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
      if (!baseUrl) {
        setStatus('NeedMap API is not configured on this build.');
        return;
      }

      const url = `${baseUrl}/v1/needs?lat=${position.coords.latitude}&lng=${position.coords.longitude}&radiusKm=25`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`NeedMap request failed: ${response.status}`);
      const data = (await response.json()) as Need[];
      setNeeds(data);
      setStatus(data.length === 0 ? 'No reported needs were found within 25 km.' : `${data.length} reported need${data.length === 1 ? '' : 's'} within 25 km.`);
    } catch {
      setStatus('Nearby needs could not be loaded. Check connectivity and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNearby();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needs.filter((need) => {
      const matches = `${need.title} ${need.category} ${(need.sdgTags || []).join(' ')}`.toLowerCase().includes(needle);
      return matches && (filter === 'all' || (filter === 'verified' ? isConfirmed(need.verificationState) : !isConfirmed(need.verificationState)));
    });
  }, [needs, query, filter]);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.screen}>
        <StitchTopBar title="NeedMap" showBack />
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.searchRow}>
            <View style={s.search}>
              <Ionicons name="search" size={21} color={Stitch.color.onSurfaceVariant} />
              <TextInput
                style={s.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search nearby needs…"
                placeholderTextColor="#6D7580"
              />
            </View>
            <Pressable style={s.refresh} onPress={() => void loadNearby()} accessibilityLabel="Refresh nearby needs">
              <Ionicons name="locate-outline" size={21} color={Stitch.color.primary} />
            </Pressable>
          </View>

          <View style={s.discoveryBanner}>
            <View style={s.discoveryHalo} pointerEvents="none" />
            <View style={s.discoveryMark}><Ionicons name="navigate" size={21} color="#C0F2DC" /><Text style={s.discoveryKicker}>LOCATION-AWARE DISCOVERY</Text></View>
            <Text style={s.discoveryTitle}>Find where your response matters.</Text>
            <Text style={s.discoveryText}>Explore actual reported needs near the device location. Results retain their verification state so you can assess them responsibly.</Text>
            <View style={s.discoveryFooter}><View style={s.discoveryChip}><Ionicons name="radio-button-on" size={13} color="#A9E5BC" /><Text style={s.discoveryChipText}>25 km search radius</Text></View>
              <Pressable style={s.discoveryAction} onPress={() => router.push('/report')} accessibilityRole="button"><Text style={s.discoveryActionText}>Report a need</Text><Ionicons name="arrow-forward" size={17} color="#092E3F"/></Pressable>
            </View>
          </View>

          <View style={s.filterSection}>
            <Text style={s.filterHeading}>Filter by evidence state</Text>
            <View style={s.filterRow}>
              {([{value:'all',label:'All reports'},{value:'verified',label:'Verified'},{value:'unverified',label:'Awaiting verification'}] as const).map(option=>(
                <Pressable key={option.value} accessibilityRole="button" accessibilityState={{selected:filter===option.value}} onPress={()=>setFilter(option.value)}
                 style={[s.filterChip,filter===option.value&&s.filterChipSelected]}>
                  <Text style={[s.filterChipText,filter===option.value&&s.filterChipTextSelected]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.statusCard}>
            {loading && <ActivityIndicator color={Stitch.color.primary} />}
            <View style={s.flex}>
              <Text style={s.statusTitle}>{loading ? 'Refreshing NeedMap' : status}</Text>
              <Text style={s.statusText}>Radius: 25 km · tap any result to inspect its verification state and evidence context.</Text>
            </View>
          </View>

          <View style={s.sectionHead}>
            <Text style={s.section}>Nearby community intelligence</Text>
            <View style={s.count}><Text style={s.countText}>{visible.length}</Text></View>
          </View>

          {!loading && visible.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="map-outline" size={34} color={Stitch.color.onSurfaceVariant} />
              <Text style={s.emptyTitle}>No matching needs nearby</Text>
              <Text style={s.muted}>Try a different search or report what you can see in your own location.</Text>
              <Pressable style={s.amber} onPress={() => router.push('/report')} accessibilityRole="button">
                <Text style={s.amberText}>Report a need</Text>
              </Pressable>
            </View>
          )}

          {visible.map((need) => (
            <Pressable
              key={need.id}
              style={s.card}
              onPress={() => router.push(`/need/${need.id}`)}
              accessibilityRole="button"
            >
              <View style={s.iconBox}>
                <Ionicons name={categoryIcon(need.category)} size={26} color={Stitch.color.primary} />
              </View>
              <View style={s.flex}>
                <View style={s.cardTop}>
                  <Text style={s.category}>
                    {need.sdgTags.length ? need.sdgTags.map((number) => `SDG ${number}`).join(' · ') : human(need.category || 'community')}
                  </Text>
                  <View
                    style={[
                      s.state,
                      isConfirmed(need.verificationState) && s.stateVerified,
                      need.verificationState === 'rejected' && s.stateRejected,
                    ]}
                  >
                    <Text
                      style={[
                        s.stateText,
                        isConfirmed(need.verificationState) && s.stateVerifiedText,
                        need.verificationState === 'rejected' && s.stateRejectedText,
                      ]}
                    >
                      {verificationLabel(need.verificationState)}
                    </Text>
                  </View>
                </View>
                <Text style={s.cardTitle}>{need.title}</Text>
                <View style={s.coordinates}>
                  <Ionicons name="location-outline" size={15} color={Stitch.color.onSurfaceVariant} />
                  <Text style={s.meta}>{need.latitude.toFixed(4)}, {need.longitude.toFixed(4)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Stitch.color.primary} />
            </Pressable>
          ))}

          <View style={s.truth}>
            <Ionicons name="information-circle-outline" size={22} color={Stitch.color.primary} />
            <Text style={s.truthText}>
              NeedMap discovery and coordinates are live. Interactive third-party map tiles and clustering remain a visual/provider layer behind the shared geospatial service rather than an invented client-side capability.
            </Text>
          </View>
        </ScrollView>
        <StitchBottomNav />
      </View>
    </SafeAreaView>
  );
}

function isConfirmed(state: string) {
  return ['community_confirmed', 'institution_confirmed', 'expert_confirmed', 'independently_audited', 'government_confirmed'].includes(state);
}

function verificationLabel(state: string) {
  if (isConfirmed(state)) return 'Verified';
  if (state === 'verification_requested') return 'Verification requested';
  if (state === 'disputed') return 'Disputed';
  if (state === 'rejected') return 'Rejected';
  return 'Observed';
}

function human(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function categoryIcon(value: string): keyof typeof Ionicons.glyphMap {
  const category = value.toLowerCase();
  if (category.includes('water')) return 'water-outline';
  if (category.includes('education')) return 'school-outline';
  if (category.includes('health')) return 'medkit-outline';
  if (category.includes('environment')) return 'leaf-outline';
  if (category.includes('infrastructure')) return 'construct-outline';
  return 'people-outline';
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Stitch.color.background },
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingBottom: Stitch.space.xxl },
  searchRow: { padding: Stitch.space.screen, paddingBottom: Stitch.space.sm, flexDirection: 'row', gap: Stitch.space.sm },
  search: { flex: 1, minHeight: 48, paddingHorizontal: Stitch.space.md, borderWidth: 1, borderColor: Stitch.color.outlineVariant, borderRadius: Stitch.radius.md, backgroundColor: Stitch.color.surfaceLowest, flexDirection: 'row', alignItems: 'center', gap: Stitch.space.sm },
  searchInput: { flex: 1, ...Stitch.type.body, color: Stitch.color.onSurface },
  refresh: { width: 48, height: 48, borderRadius: Stitch.radius.md, borderWidth: 1, borderColor: Stitch.color.outlineVariant, backgroundColor: Stitch.color.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  map: { height: 260, backgroundColor: '#DDE4E9', position: 'relative', overflow: 'hidden', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Stitch.color.outlineVariant, justifyContent: 'flex-end' },
  mapPatternA: { position: 'absolute', width: 340, height: 110, borderWidth: 14, borderColor: 'rgba(255,255,255,.42)', borderRadius: 90, transform: [{ rotate: '-18deg' }], top: 40, left: -80 },
  mapPatternB: { position: 'absolute', width: 280, height: 80, borderWidth: 10, borderColor: 'rgba(21,59,91,.12)', borderRadius: 70, transform: [{ rotate: '24deg' }], top: 120, right: -70 },
  pin: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: Stitch.color.surfaceLowest, alignItems: 'center', justifyContent: 'center' },
  pinObserved: { backgroundColor: Stitch.color.tertiaryFixed },
  pinVerified: { backgroundColor: Stitch.color.secondaryFixed },
  mapCaption: { padding: Stitch.space.base, paddingRight: Stitch.space.xl, backgroundColor: 'rgba(0,37,64,.90)' },
  mapTitle: { ...Stitch.type.card, color: Stitch.color.onPrimary },
  mapText: { ...Stitch.type.footnote, color: Stitch.color.primaryFixed, marginTop: 2 },
  statusCard: { margin: Stitch.space.screen, marginBottom: 0, minHeight: 82, padding: Stitch.space.base, borderWidth: 1, borderColor: Stitch.color.outlineVariant, borderRadius: Stitch.radius.lg, backgroundColor: Stitch.color.surfaceLowest, flexDirection: 'row', alignItems: 'center', gap: Stitch.space.md },
  statusTitle: { ...Stitch.type.bodyBold, color: Stitch.color.onSurface },
  statusText: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant, marginTop: 3 },
  sectionHead: { paddingHorizontal: Stitch.space.screen, paddingTop: Stitch.space.xl, paddingBottom: Stitch.space.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { ...Stitch.type.headline, color: Stitch.color.onSurface },
  count: { minWidth: 30, height: 30, paddingHorizontal: 8, borderRadius: 15, backgroundColor: Stitch.color.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  countText: { ...Stitch.type.tag, color: Stitch.color.onPrimary },
  card: { marginHorizontal: Stitch.space.screen, marginBottom: Stitch.space.md, minHeight: 112, padding: Stitch.space.card, borderWidth: 1, borderColor: Stitch.color.outlineVariant, borderRadius: Stitch.radius.lg, backgroundColor: Stitch.color.surfaceLowest, flexDirection: 'row', alignItems: 'center', gap: Stitch.space.md },
  iconBox: { width: 54, height: 54, borderRadius: Stitch.radius.md, backgroundColor: Stitch.color.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Stitch.space.sm },
  category: { flex: 1, ...Stitch.type.tag, color: Stitch.color.secondary },
  state: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Stitch.radius.full, backgroundColor: Stitch.color.tertiaryFixed },
  stateVerified: { backgroundColor: Stitch.color.secondaryFixed },
  stateRejected: { backgroundColor: Stitch.color.errorContainer },
  stateText: { ...Stitch.type.footnote, color: Stitch.color.tertiary },
  stateVerifiedText: { color: Stitch.color.secondary },
  stateRejectedText: { color: Stitch.color.error },
  cardTitle: { ...Stitch.type.card, color: Stitch.color.onSurface, marginTop: 5 },
  coordinates: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  meta: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant },
  empty: { marginHorizontal: Stitch.space.screen, padding: Stitch.space.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: Stitch.color.outlineVariant, borderRadius: Stitch.radius.lg, alignItems: 'center', gap: Stitch.space.sm, backgroundColor: Stitch.color.surfaceLowest },
  emptyTitle: { ...Stitch.type.card, color: Stitch.color.onSurface },
  muted: { ...Stitch.type.body, color: Stitch.color.onSurfaceVariant, textAlign: 'center' },
  amber: { minHeight: 44, paddingHorizontal: Stitch.space.base, borderRadius: Stitch.radius.md, backgroundColor: Stitch.color.amber, alignItems: 'center', justifyContent: 'center' },
  amberText: { ...Stitch.type.bodyBold, color: Stitch.color.primary },
  truth: { marginHorizontal: Stitch.space.screen, padding: Stitch.space.base, borderWidth: 1, borderColor: Stitch.color.outlineVariant, borderRadius: Stitch.radius.md, backgroundColor: Stitch.color.surfaceLow, flexDirection: 'row', alignItems: 'flex-start', gap: Stitch.space.md },
  truthText: { flex: 1, ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant },
  discoveryBanner:{marginHorizontal:Stitch.space.screen,borderRadius:24,backgroundColor:'#092E3F',padding:22,gap:13,position:'relative',overflow:'hidden'},
  discoveryHalo:{position:'absolute',width:240,height:240,right:-118,top:-120,borderWidth:48,borderColor:'rgba(166,232,196,0.1)',borderRadius:120},
  discoveryMark:{flexDirection:'row',alignItems:'center',gap:8},
  discoveryKicker:{...Stitch.type.eyebrow,color:'#B4ECD1',fontSize:10},
  discoveryTitle:{...Stitch.type.headline,color:'#FFFFFF',fontSize:29,lineHeight:35,maxWidth:300},
  discoveryText:{...Stitch.type.body,color:'#DBEDE8',fontSize:13,lineHeight:20},
  discoveryFooter:{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap',justifyContent:'space-between'},
  discoveryChip:{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:8},
  discoveryChipText:{...Stitch.type.footnote,color:'#D8EFE6'},
  discoveryAction:{minHeight:44,paddingHorizontal:14,borderRadius:12,backgroundColor:'#DBF3E3',flexDirection:'row',alignItems:'center',gap:7},
  discoveryActionText:{...Stitch.type.bodyBold,fontSize:12,color:'#092E3F'},
  filterSection:{paddingHorizontal:Stitch.space.screen,paddingTop:20,gap:10},
  filterHeading:{...Stitch.type.bodyBold,color:Stitch.color.primary},
  filterRow:{flexDirection:'row',gap:8,flexWrap:'wrap'},
  filterChip:{minHeight:44,paddingVertical:10,paddingHorizontal:12,backgroundColor:'#FFFFFF',borderRadius:12,borderWidth:1,borderColor:'#D4E2E0',alignItems:'center',justifyContent:'center'},
  filterChipSelected:{backgroundColor:'#CDEBDB',borderColor:'#5FAF8B'},
  filterChipText:{...Stitch.type.footnote,color:Stitch.color.onSurfaceVariant,fontSize:12,fontWeight:'700'},
  filterChipTextSelected:{color:'#0C5137'},
});
