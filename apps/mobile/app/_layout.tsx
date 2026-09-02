import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { installDemoBackend } from '../lib/demo-backend';

installDemoBackend();

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
