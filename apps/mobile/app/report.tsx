import { useState } from 'react';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function ReportNeed() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationLabel, setLocationLabel] = useState('Add current location');

  async function captureLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Location not granted', 'You can still continue and add a location later.');
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocationLabel(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
  }

  function continueReport() {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Add more detail', 'A short title and description help the community understand what needs attention.');
      return;
    }
    Alert.alert('Draft saved', 'This foundation slice stores the reporting intent in the UI. Evidence capture, local persistence and API submission come next.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={styles.back}>← Back</Text></Pressable>
        <Text style={styles.eyebrow}>REPORT A NEED</Text>
        <Text style={styles.title}>Put a spotlight on something your community can change.</Text>
        <Text style={styles.help}>A report is an observation, not yet a verified fact or fundraising campaign. The community verification step follows.</Text>

        <View style={styles.panel}>
          <Text style={styles.label}>What needs attention?</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Public water point is no longer working" style={styles.input} />
          <Text style={styles.label}>What are you seeing?</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Describe the current situation, who is affected, and why it matters." multiline style={[styles.input, styles.textarea]} />
          <Text style={styles.label}>Where is it?</Text>
          <Pressable style={styles.secondary} onPress={captureLocation} accessibilityRole="button"><Text style={styles.secondaryText}>{locationLabel}</Text></Pressable>
          <View style={styles.evidence}><Text style={styles.evidenceTitle}>Evidence capture</Text><Text style={styles.evidenceText}>Camera, video, timestamps and safe beneficiary-consent controls are the next implementation slice.</Text></View>
          <Pressable style={styles.primary} onPress={continueReport} accessibilityRole="button"><Text style={styles.primaryText}>Continue report</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8FB' },
  content: { padding: 20, gap: 14 },
  back: { color: '#2D6E9F', fontWeight: '800', fontSize: 15 },
  eyebrow: { color: '#2D7A56', fontWeight: '900', letterSpacing: 1.5, fontSize: 12, marginTop: 8 },
  title: { color: '#17324D', fontSize: 28, lineHeight: 34, fontWeight: '900' },
  help: { color: '#5E6F7E', lineHeight: 21 },
  panel: { backgroundColor: 'white', borderRadius: 20, padding: 17, gap: 10 },
  label: { color: '#17324D', fontWeight: '800', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#D5DEE6', backgroundColor: '#FBFCFD', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, color: '#142B3E' },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  secondary: { borderWidth: 1, borderColor: '#9CB8CD', padding: 13, borderRadius: 13 },
  secondaryText: { color: '#2D6E9F', fontWeight: '700' },
  evidence: { backgroundColor: '#FFF7E7', borderRadius: 13, padding: 13, gap: 4 },
  evidenceTitle: { color: '#6D4A14', fontWeight: '800' },
  evidenceText: { color: '#7D6848', lineHeight: 19, fontSize: 13 },
  primary: { marginTop: 8, backgroundColor: '#153B5B', borderRadius: 14, padding: 15 },
  primaryText: { color: 'white', textAlign: 'center', fontWeight: '900', fontSize: 16 }
});
