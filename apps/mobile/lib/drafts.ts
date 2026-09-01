import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { CoordinateSource } from './coordinates';

const DRAFT_KEY = 'irespond.need-draft.v1';
const PROFILE_KEY = 'irespond.ability-profile.v1';

export type NeedDraft = {
  title: string;
  description: string;
  category?: string;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  locationSource?: CoordinateSource;
  locationAccuracyMeters?: number;
  locationCapturedAt?: string;
  locationConfirmedAt?: string;
  evidenceUris: string[];
  updatedAt: string;
};

export type AbilityProfile = {
  displayName: string;
  place: string;
  position: string;
  abilities: string[];
};

export async function saveNeedDraft(draft: NeedDraft) {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export async function loadNeedDraft(): Promise<NeedDraft | null> {
  const value = await AsyncStorage.getItem(DRAFT_KEY);
  return value ? (JSON.parse(value) as NeedDraft) : null;
}

export async function clearNeedDraft() {
  await AsyncStorage.removeItem(DRAFT_KEY);
}

export async function saveAbilityProfile(profile: AbilityProfile) {
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadAbilityProfile(): Promise<AbilityProfile | null> {
  const value = await SecureStore.getItemAsync(PROFILE_KEY);
  return value ? (JSON.parse(value) as AbilityProfile) : null;
}
