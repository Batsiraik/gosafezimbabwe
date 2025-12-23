# Quick Fix: API 35 Build Error

## The Problem
Your Android SDK platform-35 is corrupted or not fully installed.

## Quick Fix (5 minutes)

### Step 1: Open Android Studio
```bash
npx cap open android
```

### Step 2: Reinstall API 35
1. In Android Studio: **Tools → SDK Manager**
2. Click **SDK Platforms** tab
3. **Uncheck** "Android 15.0 (API 35)" 
4. Click **Apply** (this uninstalls it)
5. **Check** "Android 15.0 (API 35)" again
6. Click **Apply** (this reinstalls it fresh)
7. Wait for download/installation (may take a few minutes)

### Step 3: Update Build Tools
1. Still in SDK Manager, click **SDK Tools** tab
2. Check **"Show Package Details"** (bottom right)
3. Expand **"Android SDK Build-Tools"**
4. Make sure **35.0.0** (or latest) is checked
5. Click **Apply**

### Step 4: Clean and Rebuild
```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

---

## Alternative: Use API 34 Temporarily

If API 35 keeps failing, you can test with API 34 first:

1. Update `android/variables.gradle`:
   ```
   compileSdkVersion = 34
   targetSdkVersion = 34
   ```

2. Build and test

3. **Note**: Google Play requires API 35, so you'll need to fix API 35 eventually, but this lets you test the build process first.

---

**Most likely solution: Reinstall API 35 via SDK Manager! 🔧**
