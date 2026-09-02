import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export async function setDeviceItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getDeviceItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return window.localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}
