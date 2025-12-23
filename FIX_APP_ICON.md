# Fix App Icon Not Showing

## Common Issues & Solutions

### Issue 1: Build Cache
Android Studio caches icons. You need to:
1. **Clean Build**: Build → Clean Project
2. **Invalidate Caches**: File → Invalidate Caches → Invalidate and Restart
3. **Rebuild**: Build → Rebuild Project

### Issue 2: App Not Uninstalled
Old app icon is cached on your phone:
1. **Uninstall** the app completely from your phone
2. **Restart** your phone (optional but helps)
3. **Install** the new APK

### Issue 3: Adaptive Icon Setup
Android 8.0+ uses adaptive icons. The current setup might not be working correctly.

---

## Quick Fix Steps

### Step 1: Verify Your Icon Files
Make sure you replaced ALL icon files in these folders:
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`

**Check:** Open one of these files - does it show YOUR logo or the default Capacitor icon?

### Step 2: Clean Everything
In Android Studio:
1. **Build → Clean Project**
2. **File → Invalidate Caches → Invalidate and Restart**
3. Close Android Studio
4. Delete these folders:
   - `android/app/build/`
   - `android/.gradle/` (if exists)
5. Reopen Android Studio

### Step 3: Rebuild
1. **Build → Rebuild Project**
2. Wait for build to complete
3. **Build → Build Bundle(s) / APK(s) → Build APK(s)**

### Step 4: Uninstall & Reinstall
1. **Uninstall** the app from your phone completely
2. **Restart** your phone (helps clear icon cache)
3. **Install** the new APK
4. Check if icon appears correctly

---

## Alternative: Simplify Adaptive Icon

If the adaptive icon is causing issues, we can simplify it to use your icon directly.
