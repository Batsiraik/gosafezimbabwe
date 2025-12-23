# Fix App Icon - Step by Step

## Step 1: Verify Your Icon Files Are Actually Replaced

**Check if you actually replaced the icon files:**

1. Open: `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`
2. Does it show YOUR logo or the default Capacitor icon?
3. If it shows the default icon, you need to replace it!

**To replace:**
1. Get your custom icon (1024x1024px PNG)
2. Resize it to these sizes:
   - 48x48px → `mipmap-mdpi/ic_launcher.png`
   - 72x72px → `mipmap-hdpi/ic_launcher.png`
   - 96x96px → `mipmap-xhdpi/ic_launcher.png`
   - 144x144px → `mipmap-xxhdpi/ic_launcher.png`
   - 192x192px → `mipmap-xxxhdpi/ic_launcher.png`
3. **Replace** the files in each folder
4. Also create `ic_launcher_round.png` (same sizes) in each folder

---

## Step 2: Clean Build Cache

### In Android Studio:
1. **Build → Clean Project**
2. **File → Invalidate Caches → Invalidate and Restart**
3. Wait for Android Studio to restart

### Delete Build Folders:
Close Android Studio, then delete:
- `android/app/build/` folder
- `android/.gradle/` folder (if exists)
- `android/build/` folder (if exists)

---

## Step 3: Rebuild Project

1. Reopen Android Studio
2. **Build → Rebuild Project**
3. Wait for build to complete (may take a few minutes)

---

## Step 4: Build New APK

1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for APK to be generated
3. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Step 5: Uninstall Old App & Install New

**IMPORTANT:** You MUST uninstall the old app first!

1. On your phone: **Settings → Apps → GO SAFE → Uninstall**
2. **Restart your phone** (clears icon cache)
3. **Install** the new APK
4. Check if your custom icon appears

---

## Step 6: If Still Not Working - Check Adaptive Icon

The adaptive icon might need adjustment. Let me know if you need help with this.

---

## Quick Checklist

- [ ] Verified icon files are actually YOUR logo (not default)
- [ ] Replaced icons in ALL mipmap folders (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- [ ] Created ic_launcher_round.png in all folders
- [ ] Cleaned build cache in Android Studio
- [ ] Invalidated caches and restarted Android Studio
- [ ] Deleted build folders manually
- [ ] Rebuilt project
- [ ] Built new APK
- [ ] Uninstalled old app from phone
- [ ] Restarted phone
- [ ] Installed new APK
- [ ] Icon still not showing? → Check adaptive icon setup

---

## Common Mistakes

❌ **Only replaced one size** - Need ALL sizes
❌ **Didn't uninstall old app** - Icon cache persists
❌ **Didn't clean build** - Old icons cached
❌ **Wrong file format** - Must be PNG
❌ **Wrong file names** - Must be exactly `ic_launcher.png`

---

## Still Not Working?

If after all these steps the icon still doesn't show:
1. Share a screenshot of one of your icon files (to verify it's your logo)
2. Check Android Studio build logs for any errors
3. We may need to adjust the adaptive icon XML configuration
