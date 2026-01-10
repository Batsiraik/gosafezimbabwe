import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gosafeappzim.app',
  appName: 'GO SAFE',
  webDir: 'public',
  // Load from live Vercel deployment
  server: {
    url: 'https://gosafezimbabwe.vercel.app',
    cleartext: false, // HTTPS
  },
  android: {
    allowMixedContent: false, // HTTPS only
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
