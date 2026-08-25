import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AbilityProfile, loadAbilityProfile, saveAbilityProfile } from '../lib/drafts';

const abilityOptions = ['Time', 'Skills', 'Materials', 'Equipment', 'Knowledge', 'Access', 'Influence', 'Care', 'Money'];

export default function Profile() {
  const [displayName, setDisplayName] = useState('');
  const [place, setPlace] = useState('');
  const [position, setPosition] = useState('');
  const [abilities, setAbilities] = useState<string[]>([]);

  useEffect(() => {
    loadAbilityProfile().then((profile) => {
      if (!profile) return;
      setDisplayName(profile.displayName);
      setPlace(profile.place);
      setPosition(profile.position);
      setAbilities(profile.abilities);
    });
  }, []);

  function toggleAbility(value: string) {
    setAbilities((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function save() {
    if (!displayName.trim() || !place.trim()) {
      Alert.alert('Complete your profile', 'Add a name and a place so iRespond can personalise nearby action.');
      return;
    }
    const profile: AbilityProfile = { displayName: displayName.trim(), place: place.trim(), position: position.trim(), abilities };
    await saveAbilityProfile(profile);
    Alert.alert('Ability Profile saved', 'Your profile now reflects what you can contribute, not only who you follow.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>← Back</Text></Pressable>
        <Text style={styles.eyebrow}>ABILITY PROFILE</Text>
        <Text style={styles.title}>What can you contribute where you are?</Text>
        <Text style={styles.help}>Build your profile around the 3P Action Compass: your place, your position, and the abilities or resources you possess.</Text>
        <View style={styles.panel}>
          <Text style={styles.label}>Display name</Text>
          <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} placeholder="Your name" />
          <Text style={styles.label}>Place</Text>
          <TextInput value={place} onChangeText={setPlace} style={styles.input} placeholder="Community, school, workplace or city" />
          <Text style={styles.label}>Position</Text>
          <TextInput value={position} onChangeText={setPosition} style={styles.input} placeholder="Student, engineer, parent, pastor, volunteer..." />
          <Text style={styles.label}>What can you contribute?</Text>
          <View style={styles.chips}>{abilityOptions.map((ability) => <Pressable key={ability} onPress={() => toggleAbility(ability)} style={[styles.chip, abilities.includes(ability) && styles.chipActive]}><Text style={[styles.chipText, abilities.includes(ability) && styles.chipTextActive]}>{ability}</Text></Pressable>)}</View>
          <Pressable style={styles.primary} onPress={save}><Text style={styles.primaryText}>Save Ability Profile</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:20,gap:14},back:{color:'#2D6E9F',fontWeight:'800'},eyebrow:{color:'#2D7A56',fontWeight:'900',letterSpacing:1.5},title:{color:'#17324D',fontSize:28,lineHeight:34,fontWeight:'900'},help:{color:'#5E6F7E',lineHeight:21},panel:{backgroundColor:'white',borderRadius:20,padding:17,gap:10},label:{color:'#17324D',fontWeight:'800'},input:{borderWidth:1,borderColor:'#D5DEE6',backgroundColor:'#FBFCFD',borderRadius:13,padding:12},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{borderWidth:1,borderColor:'#B8C8D5',paddingHorizontal:12,paddingVertical:9,borderRadius:99},chipActive:{backgroundColor:'#E9F5EF',borderColor:'#4B9270'},chipText:{color:'#526778',fontWeight:'700'},chipTextActive:{color:'#245840'},primary:{backgroundColor:'#153B5B',padding:15,borderRadius:14,marginTop:8},primaryText:{color:'white',fontWeight:'900',textAlign:'center'} });
