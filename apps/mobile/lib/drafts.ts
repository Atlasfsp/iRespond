import type {EvidenceAttachment} from './media';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CoordinateSource } from './coordinates';
import { getDeviceItem, setDeviceItem } from './device-store';

const DRAFT_KEY = 'irespond.need-draft.v1';
const PROFILE_KEY = 'irespond.ability-profile.v1';

export type NeedDraft = {
  submissionKey?: string;
  title: string;
  description: string;
  category?: string;
  categoryDetail?: string;
  attachments?: EvidenceAttachment[];
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  locationSource?: CoordinateSource;
  locationAccuracyMeters?: number;
  locationCapturedAt?: string;
  locationConfirmedAt?: string;
  sdgTags?: number[];
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
  if(!value)return null;
  const draft=JSON.parse(value) as NeedDraft;
  if(!draft||typeof draft.title!=='string'||typeof draft.description!=='string'||!Array.isArray(draft.evidenceUris)||draft.evidenceUris.some(uri=>typeof uri!=='string')||(draft.attachments!==undefined&&(!Array.isArray(draft.attachments)||draft.attachments.some(item=>!item||typeof item.id!=='string'||typeof item.uri!=='string'||!['photo','video'].includes(item.kind)))))throw new Error('Saved report is malformed. Retry without overwriting device storage.');
  return draft;
}

export async function clearNeedDraft() {
  await AsyncStorage.removeItem(DRAFT_KEY);
}

export async function saveAbilityProfile(profile: AbilityProfile) {
  await setDeviceItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadAbilityProfile(): Promise<AbilityProfile | null> {
  const value = await getDeviceItem(PROFILE_KEY);
  return value ? (JSON.parse(value) as AbilityProfile) : null;
}
