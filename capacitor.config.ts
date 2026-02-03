import type { CapacitorConfig } from '@capacitor/cli';

const isOfflineBuild = process.env.BUILD_FOR_CAPACITOR === '1';

const config: CapacitorConfig = {
  appId: 'com.gosafeappzw.app',
  appName: 'GO SAFE',
  // Offline build: app is bundled in the APK (opens in flight mode). Normal: loads from Vercel.
  webDir: isOfflineBuild ? 'out' : 'public',
  ...(isOfflineBuild
    ? {}
    : {
        server: {
          url: 'https://gosafezimbabwe.vercel.app',
          cleartext: false,
          androidScheme: 'https',
          errorPath: 'connection_error.html',
        },
      }),
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
};

export default config;
