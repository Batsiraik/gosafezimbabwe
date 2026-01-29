# Rollout: Connection Error Fix to Production

To get the connection error fix (custom page + auto-reload) to **production users**, you need to ship **new app versions** on both Android and iOS. There is no server-only or store-only update for this; it’s in the native app and WebView config.

---

## Android (already in production)

**Yes – you need to rebuild and release a new Android version.**

1. **Rebuild**
   - On your machine: `npm run build` (if you change web assets), then `npx cap sync android`.
   - Build a **release AAB** (or APK) as you normally do for Play Store.

2. **Version**
   - Bump version in `android/app/build.gradle` (e.g. `versionCode` and `versionName`) so the store sees it as a new release.

3. **Upload & release**
   - Upload the new AAB to Google Play Console.
   - Put the release in production (or staged rollout if you prefer).

4. **Who gets the fix**
   - Users get it when they **update** the app from the Play Store (or when they install the app for the first time with the new version).

---

## iOS (in production or first release)

**Yes – you need a new iOS build and a new App Store version.**

1. **Sync**
   - Run: `npx cap sync ios`  
   - This pulls in `server.errorPath` and `public/connection_error.html` so the iOS app shows the custom error page and auto-redirect.

2. **Rebuild**
   - Open the iOS project in Xcode (`npx cap open ios`), then build/archive and upload to App Store Connect as you normally do.
   - Bump the **version** and **build number** in Xcode so the store accepts it as a new version.

3. **Submit**
   - Submit the new version for review and release to production when approved.

4. **Who gets the fix**
   - Users get it when they **update** the app from the App Store (or when they install the app for the first time with this version).

**If you also added the optional iOS native wrapper** (cache clear + reload, see `ios-assets/IOS_CONNECTION_ERROR_FIX.md`), that’s already part of this same build – no extra step.

---

## Summary

| Platform | Rebuild? | Where to release | Who gets the fix |
|----------|----------|-------------------|-------------------|
| **Android** | Yes – new AAB/APK | Google Play Console → production | Users who update (or new installs) |
| **iOS**     | Yes – new archive after `npx cap sync ios` | App Store Connect → submit for review | Users who update (or new installs) |

- **Android:** Rebuild → bump version → upload to Play Console → release to production.  
- **iOS:** `npx cap sync ios` → rebuild in Xcode → bump version/build → upload to App Store Connect → submit for review → release.

There is no way to roll out this fix without shipping new app versions; it’s not a backend or store metadata change.
