import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StitchBottomNav, StitchTopBar } from '../components/StitchChrome';
import { formatCoordinate, parseInterventionCoordinates, type CoordinateSource } from '../lib/coordinates';
import { saveNeedDraft } from '../lib/drafts';
import { Stitch } from '../lib/stitch-theme';
import { confirmQueuedNeedLocation, flushNeedQueue, getNextNeedLocationReview, type QueuedNeed } from '../lib/sync';

const categories = ['Infrastructure', 'Health', 'Environment', 'Education', 'Community'];

export default function ReportNeed() {
  const route = useLocalSearchParams<{ reviewQueue?: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Infrastructure');
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  const [locationSource, setLocationSource] = useState<CoordinateSource | null>(null);
  const [locationAccuracyMeters, setLocationAccuracyMeters] = useState<number>();
  const [locationCapturedAt, setLocationCapturedAt] = useState<string>();
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [queuedReview, setQueuedReview] = useState<QueuedNeed | null>(null);
  const [loadingQueuedReview, setLoadingQueuedReview] = useState(route.reviewQueue === '1');
  const [retryingQueuedReview, setRetryingQueuedReview] = useState(false);
  const queuedRetryInFlight = useRef(false);
  const captureInFlight = useRef(false);
  const coordinates = parseInterventionCoordinates(latitudeText, longitudeText);

  useEffect(() => {
    if (route.reviewQueue !== '1') return;
    let active = true;
    void getNextNeedLocationReview().then(item => {
      if (!active) return;
      setQueuedReview(item);
      if (!item) {
        Alert.alert('No location review needed', 'The preserved queue no longer contains an observation awaiting coordinate confirmation.', [{ text: 'Back to home', onPress: () => router.replace('/') }]);
        return;
      }
      const savedCoordinates = parseInterventionCoordinates(item.draft.latitude, item.draft.longitude);
      setTitle(item.draft.title);
      setDescription(item.draft.description);
      setCategory(categories.find(value => value.toLowerCase() === item.draft.category?.toLowerCase()) ?? 'Community');
      setLatitudeText(savedCoordinates ? formatCoordinate(savedCoordinates.latitude) : '');
      setLongitudeText(savedCoordinates ? formatCoordinate(savedCoordinates.longitude) : '');
      setLocationSource(item.draft.locationSource ?? (savedCoordinates ? 'manual' : null));
      setLocationAccuracyMeters(item.draft.locationAccuracyMeters);
      setLocationCapturedAt(item.draft.locationCapturedAt);
      setLocationConfirmed(false);
    }).catch(error => {
      if (active) Alert.alert('Unable to load pending report', error instanceof Error ? error.message : 'The preserved observation could not be loaded.');
    }).finally(() => { if (active) setLoadingQueuedReview(false); });
    return () => { active = false; };
  }, [route.reviewQueue]);

  function updateManualCoordinate(axis: 'latitude' | 'longitude', value: string) {
    if (axis === 'latitude') setLatitudeText(value);
    else setLongitudeText(value);
    setLocationSource('manual');
    setLocationAccuracyMeters(undefined);
    setLocationCapturedAt(undefined);
    setLocationConfirmed(false);
  }

  async function captureLocation() {
    if (captureInFlight.current) return;
    captureInFlight.current = true;
    setLocationConfirmed(false);
    setCapturingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location not granted', 'Enter the intervention coordinates manually, then confirm them before continuing.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitudeText(formatCoordinate(position.coords.latitude));
      setLongitudeText(formatCoordinate(position.coords.longitude));
      setLocationSource('device');
      setLocationAccuracyMeters(position.coords.accuracy ?? undefined);
      setLocationCapturedAt(new Date(position.timestamp).toISOString());
      setLocationConfirmed(false);
    } catch {
      Alert.alert('Unable to capture location', 'Check that location services are on, or enter the intervention coordinates manually.');
    } finally {
      captureInFlight.current = false;
      setCapturingLocation(false);
    }
  }

  function toggleLocationConfirmation() {
    if (locationConfirmed) {
      setLocationConfirmed(false);
      return;
    }
    if (!coordinates) {
      Alert.alert('Valid coordinates required', 'Latitude must be between -90 and 90, and longitude between -180 and 180.');
      return;
    }
    setLocationConfirmed(true);
  }

  async function continueReport() {
    if (captureInFlight.current) {
      Alert.alert('Location capture in progress', 'Wait for the replacement coordinates or location error before confirming and continuing.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      Alert.alert('Add more detail', 'A short title and description help the community understand what needs attention.');
      return;
    }
    if (!coordinates) {
      Alert.alert('Add the intervention location', 'Capture your current coordinates or enter valid latitude and longitude values manually.');
      return;
    }
    if (!locationConfirmed) {
      Alert.alert('Confirm the intervention location', 'Check both coordinates and confirm that they point to the place requiring intervention.');
      return;
    }
    const locationConfirmedAt = new Date().toISOString();
    const source = locationSource ?? 'manual';
    const locationLabel = `${source === 'device' ? 'Device capture' : 'Manual entry'} · ${formatCoordinate(coordinates.latitude)}, ${formatCoordinate(coordinates.longitude)}`;
    if (queuedReview) {
      if (queuedRetryInFlight.current) return;
      queuedRetryInFlight.current = true;
      setRetryingQueuedReview(true);
      try {
        await confirmQueuedNeedLocation(queuedReview.idempotencyKey, { ...coordinates, locationLabel, locationSource: source, locationAccuracyMeters, locationCapturedAt, locationConfirmedAt });
        const result = await flushNeedQueue();
        const synced = result.syncedKeys.includes(queuedReview.idempotencyKey);
        Alert.alert('Intervention location confirmed', synced ? 'The preserved offline observation has now reached iRespond.' : 'The preserved observation now has confirmed coordinates and remains safely queued until connectivity and any evidence upload requirements are available.', [{ text: 'Done', onPress: () => router.replace('/') }]);
      } catch (error) {
        Alert.alert('Unable to update pending report', error instanceof Error ? error.message : 'The preserved observation could not be updated.');
      } finally {
        queuedRetryInFlight.current = false;
        setRetryingQueuedReview(false);
      }
      return;
    }
    await saveNeedDraft({
      title: title.trim(),
      description: description.trim(),
      category: category.toLowerCase(),
      locationLabel,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      locationSource: source,
      locationAccuracyMeters,
      locationCapturedAt,
      locationConfirmedAt,
      evidenceUris: [],
      updatedAt: locationConfirmedAt,
    });
    router.push('/evidence');
  }

  return <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}><View style={s.screen}><StitchTopBar/><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.cameraPanel}><View style={s.cameraGrid}><View style={s.cameraLineV}/><View style={s.cameraLineH}/><View style={s.cameraFocus}><Ionicons name="camera-outline" size={34} color={Stitch.color.onPrimary}/></View></View><View style={s.cameraInfo}><Ionicons name="information-circle-outline" size={22} color={Stitch.color.primaryFixed}/><Text style={s.cameraText}>Describe the visible community need now. The next step captures safe evidence for the verification process.</Text></View></View>
    <View style={s.form}>
      {(loadingQueuedReview || queuedReview) && <View style={s.reviewBanner}><Ionicons name="archive-outline" size={23} color={Stitch.color.tertiary}/><View style={s.flex}><Text style={s.reviewTitle}>{loadingQueuedReview ? 'Loading preserved observation…' : 'Review a preserved offline observation'}</Text><Text style={s.reviewBody}>This report was queued by an earlier app version. Its title, description and evidence remain intact; confirm only its intervention coordinates so the same queue item can continue safely.</Text></View></View>}
      <Text style={s.eyebrow}>INTERVENTION LOCATION</Text>
      <Pressable style={[s.locationCard, capturingLocation && s.disabled]} disabled={capturingLocation} onPress={() => void captureLocation()} accessibilityRole="button">
        {capturingLocation ? <ActivityIndicator color={Stitch.color.primary}/> : <Ionicons name="locate-outline" size={28} color={Stitch.color.primary}/>}<View style={{ flex: 1 }}><Text style={s.locationTitle}>{capturingLocation ? 'Capturing precise coordinates…' : 'Use my current coordinates'}</Text><Text style={s.locationMeta}>High-accuracy device location; nothing is submitted until you confirm.</Text></View><Ionicons name="navigate-outline" size={22} color={Stitch.color.primary}/>
      </Pressable>
      <View style={s.coordinateInputs}>
        <View style={s.coordinateField}><FieldLabel required>Latitude of intervention</FieldLabel><TextInput style={s.input} value={latitudeText} onChangeText={value => updateManualCoordinate('latitude', value)} keyboardType="numbers-and-punctuation" autoCorrect={false} accessibilityLabel="Latitude of intervention" accessibilityHint="Enter a value between minus 90 and 90 degrees" placeholder="-90 to 90" placeholderTextColor="#6D7580"/></View>
        <View style={s.coordinateField}><FieldLabel required>Longitude of intervention</FieldLabel><TextInput style={s.input} value={longitudeText} onChangeText={value => updateManualCoordinate('longitude', value)} keyboardType="numbers-and-punctuation" autoCorrect={false} accessibilityLabel="Longitude of intervention" accessibilityHint="Enter a value between minus 180 and 180 degrees" placeholder="-180 to 180" placeholderTextColor="#6D7580"/></View>
      </View>
      <View style={[s.locationStatus, coordinates ? s.locationStatusReady : s.locationStatusPending]}>
        <Ionicons name={coordinates ? 'checkmark-circle-outline' : 'information-circle-outline'} size={21} color={coordinates ? Stitch.color.secondary : Stitch.color.onSurfaceVariant}/>
        <View style={s.flex}><Text style={s.locationStatusTitle}>{coordinates ? `${formatCoordinate(coordinates.latitude)}, ${formatCoordinate(coordinates.longitude)}` : 'No valid coordinates yet'}</Text><Text style={s.locationStatusBody}>{coordinates ? `${locationSource === 'device' ? 'Device captured' : 'Manually entered'}${locationAccuracyMeters !== undefined ? ` · accuracy ±${Math.round(locationAccuracyMeters)} m` : ''}${locationCapturedAt ? ` · ${new Date(locationCapturedAt).toLocaleString()}` : ''}` : 'Use device capture or type both coordinates. Manual edits replace captured coordinates.'}</Text></View>
      </View>
      <Pressable style={[s.confirmRow, !coordinates && s.disabled]} disabled={!coordinates} onPress={toggleLocationConfirmation} accessibilityRole="checkbox" accessibilityState={{ checked: locationConfirmed, disabled: !coordinates }}>
        <Ionicons name={locationConfirmed ? 'checkbox' : 'square-outline'} size={26} color={locationConfirmed ? Stitch.color.secondary : Stitch.color.onSurfaceVariant}/><Text style={s.confirmText}>I confirm these coordinates point to the intervention location.</Text>
      </Pressable>
      <FieldLabel required>Title of need</FieldLabel><TextInput style={[s.input, queuedReview && s.readOnly]} editable={!queuedReview && !loadingQueuedReview} value={title} onChangeText={setTitle} placeholder="e.g. Severe pothole on Main St" placeholderTextColor="#6D7580"/>
      <FieldLabel>Description</FieldLabel><TextInput style={[s.input, s.textarea, queuedReview && s.readOnly]} editable={!queuedReview && !loadingQueuedReview} value={description} onChangeText={setDescription} multiline placeholder="Describe the issue and its impact…" placeholderTextColor="#6D7580"/>
      <FieldLabel>Primary area of impact</FieldLabel><View accessibilityRole="radiogroup" accessibilityLabel="Primary area of impact"><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{categories.map(item => <Pressable key={item} disabled={Boolean(queuedReview || loadingQueuedReview)} accessibilityRole="radio" accessibilityState={{ checked: item === category, disabled: Boolean(queuedReview || loadingQueuedReview) }} accessibilityLabel={item} onPress={() => setCategory(item)} style={[s.chip, item === category && s.chipOn, queuedReview && s.readOnly]}><Ionicons name={item === 'Infrastructure' ? 'construct-outline' : item === 'Health' ? 'shield-checkmark-outline' : item === 'Environment' ? 'leaf-outline' : item === 'Education' ? 'school-outline' : 'people-outline'} size={18} color={item === category ? Stitch.color.primaryFixed : Stitch.color.onSurface}/><Text style={[s.chipText, item === category && s.chipTextOn]}>{item}</Text></Pressable>)}</ScrollView></View>
      <View style={s.truth}><Text style={s.truthTitle}>Observation first</Text><Text style={s.truthBody}>Submitting creates an observation. Verification, project approval and fundraising are separate governed states.</Text></View>
      <Pressable style={[s.primary, (capturingLocation || retryingQueuedReview || loadingQueuedReview) && s.disabled]} disabled={capturingLocation || retryingQueuedReview || loadingQueuedReview} accessibilityState={{ disabled: capturingLocation || retryingQueuedReview || loadingQueuedReview, busy: capturingLocation || retryingQueuedReview }} onPress={() => void continueReport()}><Ionicons name={queuedReview ? 'sync-outline' : 'send-outline'} size={22} color={Stitch.color.primary}/><Text style={s.primaryText}>{retryingQueuedReview ? 'Confirming location & retrying…' : capturingLocation ? 'Waiting for coordinates…' : queuedReview ? 'Confirm location & retry sync' : 'Save draft & add evidence'}</Text></Pressable>
    </View>
  </ScrollView><StitchBottomNav/></View></SafeAreaView>;
}

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return <Text style={s.label}>{children.toUpperCase()}{required && <Text style={s.required}> *</Text>}</Text>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Stitch.color.background }, screen: { flex: 1 }, content: { paddingBottom: Stitch.space.xl },
  cameraPanel: { backgroundColor: Stitch.color.surfaceHigh }, cameraGrid: { height: 250, backgroundColor: '#52616A', position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, cameraLineV: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: 'rgba(255,255,255,.25)' }, cameraLineH: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: 'rgba(255,255,255,.25)' }, cameraFocus: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: Stitch.color.onPrimary, backgroundColor: 'rgba(0,0,0,.18)', alignItems: 'center', justifyContent: 'center' },
  cameraInfo: { paddingHorizontal: Stitch.space.screen, paddingVertical: Stitch.space.base, backgroundColor: Stitch.color.primaryContainer, flexDirection: 'row', gap: Stitch.space.md, alignItems: 'flex-start' }, cameraText: { flex: 1, ...Stitch.type.body, color: Stitch.color.onPrimaryContainer },
  form: { padding: Stitch.space.screen, gap: Stitch.space.md }, eyebrow: { ...Stitch.type.eyebrow, color: Stitch.color.onSurfaceVariant },
  reviewBanner: { padding: Stitch.space.base, borderWidth: 1, borderColor: Stitch.color.tertiary, borderRadius: Stitch.radius.lg, backgroundColor: Stitch.color.tertiaryFixed, flexDirection: 'row', gap: Stitch.space.sm, alignItems: 'flex-start' }, reviewTitle: { ...Stitch.type.bodyBold, color: Stitch.color.tertiary }, reviewBody: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant, marginTop: 2 },
  locationCard: { minHeight: 96, padding: Stitch.space.base, flexDirection: 'row', alignItems: 'center', gap: Stitch.space.md, borderWidth: 1, borderColor: Stitch.color.outlineVariant, borderRadius: Stitch.radius.md, backgroundColor: Stitch.color.surfaceLow }, locationTitle: { ...Stitch.type.card, color: Stitch.color.onSurface }, locationMeta: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant, marginTop: 3 },
  coordinateInputs: { flexDirection: 'row', gap: Stitch.space.sm }, coordinateField: { flex: 1, gap: Stitch.space.sm }, locationStatus: { padding: Stitch.space.base, borderRadius: Stitch.radius.md, borderWidth: 1, flexDirection: 'row', gap: Stitch.space.sm, alignItems: 'flex-start' }, locationStatusReady: { backgroundColor: '#F0FAF5', borderColor: Stitch.color.secondaryFixedDim }, locationStatusPending: { backgroundColor: Stitch.color.surfaceLow, borderColor: Stitch.color.outlineVariant }, locationStatusTitle: { ...Stitch.type.bodyBold, color: Stitch.color.onSurface }, locationStatusBody: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant, marginTop: 2 }, flex: { flex: 1 },
  confirmRow: { minHeight: 54, padding: Stitch.space.base, borderWidth: 1, borderColor: Stitch.color.outlineVariant, borderRadius: Stitch.radius.md, flexDirection: 'row', alignItems: 'center', gap: Stitch.space.sm, backgroundColor: Stitch.color.surfaceLowest }, confirmText: { flex: 1, ...Stitch.type.bodyBold, color: Stitch.color.onSurface }, disabled: { opacity: .55 },
  readOnly: { opacity: .72 },
  label: { ...Stitch.type.tag, color: Stitch.color.onSurfaceVariant, textTransform: 'uppercase', marginTop: Stitch.space.sm }, required: { color: Stitch.color.error }, input: { minHeight: 52, paddingHorizontal: Stitch.space.base, paddingVertical: 14, borderWidth: 1, borderColor: Stitch.color.outlineVariant, borderRadius: Stitch.radius.md, backgroundColor: Stitch.color.surfaceLowest, color: Stitch.color.onSurface, ...Stitch.type.body }, textarea: { minHeight: 120, textAlignVertical: 'top' },
  chips: { gap: Stitch.space.sm, paddingRight: Stitch.space.screen }, chip: { minHeight: 44, paddingHorizontal: Stitch.space.base, borderRadius: Stitch.radius.full, borderWidth: 1, borderColor: Stitch.color.outlineVariant, backgroundColor: Stitch.color.surfaceLowest, flexDirection: 'row', alignItems: 'center', gap: Stitch.space.sm }, chipOn: { backgroundColor: Stitch.color.primaryContainer, borderColor: Stitch.color.primary }, chipText: { ...Stitch.type.body, color: Stitch.color.onSurface }, chipTextOn: { color: Stitch.color.primaryFixed },
  truth: { padding: Stitch.space.base, borderRadius: Stitch.radius.md, backgroundColor: Stitch.color.surfaceLow, borderWidth: 1, borderColor: Stitch.color.outlineVariant, gap: 3 }, truthTitle: { ...Stitch.type.bodyBold, color: Stitch.color.primary }, truthBody: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant }, primary: { minHeight: 56, marginTop: Stitch.space.md, paddingHorizontal: Stitch.space.base, borderRadius: Stitch.radius.hero, backgroundColor: Stitch.color.amber, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Stitch.space.sm }, primaryText: { ...Stitch.type.card, color: Stitch.color.primary, fontWeight: '900' },
});
