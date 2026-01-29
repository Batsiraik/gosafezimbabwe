import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gosafeappzw.app',
  appName: 'GO SAFE',
  webDir: 'public',
  // ⚠️ CRITICAL FIX: Using remote URL with error handling
  // The app loads from Vercel, but MainActivity.java now handles errors automatically
  // If you want to bundle locally (better reliability), comment out server.url and run:
  // npm run build && npx cap sync
  server: {
    url: 'https://gosafezimbabwe.vercel.app',
    cleartext: false, // HTTPS
    androidScheme: 'https',
    // iOS: show custom error page on load failure (Android uses MainActivity.java)
    errorPath: 'connection_error.html',
  },
  android: {
    allowMixedContent: false, // HTTPS only
    captureInput: true,
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
};

export default config;
