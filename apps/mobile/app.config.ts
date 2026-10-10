import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const demoMode = process.env.EXPO_PUBLIC_DEMO_MODE === '1';
  if (!demoMode) return config as ExpoConfig;

  return {
    ...config,
    name: 'iRespond Offline Demo',
    slug: 'irespond-offline-demo',
    scheme: 'irespond-demo',
    ios: {
      ...config.ios,
      bundleIdentifier: 'global.irespond.app.demo',
    },
    android: {
      ...config.android,
      package: 'global.irespond.app.demo',
    },
    extra: {
      ...config.extra,
      offlineDemo: true,
    },
  };
};
