# Offline-First Build: App Opens Even in Flight Mode

## What This Does

The app can now be **bundled inside the APK** so it **opens from local files** (like Facebook):

- **Flight mode / no internet:** App opens and shows the homepage (and any previously visited UI). No more "Connection issue" or white screen on launch.
- **When online:** All API calls go to Vercel; data loads as usual.
- **First open:** No network needed for the shell; only data (rides, bookings, etc.) needs the network.

This should **dramatically reduce** connection complaints and 1-star reviews, because the app **always opens** and only needs the network for live data.

---

## How to Build the Offline-First Android App

### 1. Install dependency (one time)

```bash
npm install
```

(This installs `cross-env` so the build works on Windows.)

### 2. Build for Capacitor (offline bundle)

From the project root:

```bash
npm run build:capacitor
```

This will:

1. Run Prisma generate  
2. **Temporarily move** `src/app/api` aside (static export can't include API routes)  
3. Build Next.js as a **static export** (output in `out/`)  
4. **Restore** `src/app/api`  
5. Sync the `out/` folder into the Android project  

The app will now load from the **bundled files** inside the APK, not from the remote URL. API calls still go to Vercel when the user is online.

### 3. Build the release AAB

```bash
cd android
.\gradlew.bat clean
.\gradlew.bat bundleRelease
cd ..
```

Upload `android\app\build\outputs\bundle\release\app-release.aab` to Google Play as usual.

---

## Two Build Modes (Summary)

| Mode | When | Command | Result |
|------|------|--------|--------|
| **Vercel (web)** | Deploy to Vercel | `npm run build` (no env) | Normal Next.js build; deploy to Vercel. |
| **Capacitor (offline)** | Release Android app | `npm run build:capacitor` | Static export → `out/` → bundled in APK; app opens offline. |

- **Do not** set `BUILD_FOR_CAPACITOR=1` when deploying to Vercel.  
- **Do** use `npm run build:capacitor` when building the Android app for release.

---

## What Users See

- **No internet / flight mode:** App opens; homepage (and cached UI) shows. Data-dependent parts show "no connection" or empty until back online.
- **With internet:** Same as before; all features work and API calls go to Vercel.

---

## If You Need to Revert (load from URL again)

In `capacitor.config.ts`, you can temporarily ignore the offline build and load from Vercel again by forcing `isOfflineBuild = false` (e.g. remove or don’t set `BUILD_FOR_CAPACITOR=1`) and using `webDir: 'public'` with `server.url` set. The current config switches automatically based on `BUILD_FOR_CAPACITOR`.

---

## iOS

Same idea: use the offline build, then sync iOS:

```bash
npm run build:capacitor:ios
```

Then open Xcode, build, and archive as usual. The iOS app will also load from the bundled `out/` content and open offline.
