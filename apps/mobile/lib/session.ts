import * as SecureStore from 'expo-secure-store';

import { demoMode } from './demo-backend';

const ACCESS_TOKEN_KEY = 'irespond.oidc.access-token.v1';
const EXPIRES_AT_KEY = 'irespond.oidc.expires-at.v1';

export async function saveAccessToken(token: string, expiresInSeconds?: number) {
  if (demoMode) return;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  if (expiresInSeconds) {
    await SecureStore.setItemAsync(EXPIRES_AT_KEY, String(Date.now() + expiresInSeconds * 1000));
  } else {
    await SecureStore.deleteItemAsync(EXPIRES_AT_KEY);
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (demoMode) return 'irespond-demo-access-token';
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (!token) return null;
  const expiry = await SecureStore.getItemAsync(EXPIRES_AT_KEY);
  if (expiry && Number(expiry) <= Date.now() + 30_000) {
    await clearSession();
    return null;
  }
  return token;
}

export async function clearSession() {
  if (demoMode) return;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(EXPIRES_AT_KEY)
  ]);
}
