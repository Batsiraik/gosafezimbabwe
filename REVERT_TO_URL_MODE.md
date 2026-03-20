# URGENT: Revert to URL Mode (App Loads from Vercel Again)

The offline bundle (version 54) caused broken images and issues. Use **URL mode** again so the app loads from https://gosafezimbabwe.vercel.app and works.

---

## Do this to ship the fix (version 55)

**1. Sync Capacitor in URL mode (do NOT use build:capacitor)**

From project root:

```bash
npx cap sync android
```

Do **not** set `BUILD_FOR_CAPACITOR`. Do **not** run `npm run build:capacitor`.  
This makes the app load from the remote URL again (like before the offline build).

**2. Build the release AAB**

```bash
cd android
.\gradlew.bat clean
.\gradlew.bat bundleRelease
cd ..
```

**3. Upload**

Upload `android\app\build\outputs\bundle\release\app-release.aab` to Google Play.  
Version is already set to **55** (5.0.5) so Play will accept it.

---

After this, the app will open and load from Vercel again. You’ll be back to the previous behavior (retries, “Open in browser,” etc.) without the broken offline bundle.
