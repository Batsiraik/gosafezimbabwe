# Fix API 35 Build Error

## Error
```
Failed to load resources table in APK 'android-35\android.jar'
```

This means the Android SDK platform-35 is corrupted or not fully installed.

---

## Solution 1: Reinstall API 35 via Android Studio (Recommended)

1. **Open Android Studio**
2. Go to **Tools → SDK Manager**
3. Click **SDK Platforms** tab
4. **Uncheck** "Android 15.0 (API 35)" if checked
5. Click **Apply** to uninstall
6. **Check** "Android 15.0 (API 35)" again
7. Click **Apply** to reinstall
8. Wait for download and installation to complete
9. Click **OK**

10. **Also check SDK Tools tab:**
    - Make sure "Android SDK Build-Tools" is updated to latest version
    - Make sure "Android SDK Platform-Tools" is updated

11. **Try building again**

---

## Solution 2: Use API 34 (Alternative - if API 35 keeps failing)

If API 35 continues to have issues, you can try API 34 first (Google Play accepts API 34+):

1. Update `android/variables.gradle`:
   ```
   compileSdkVersion = 34
   targetSdkVersion = 34
   ```

2. **Note**: Google Play currently requires API 35, but you can test with 34 first, then upgrade to 35 once it's working.

---

## Solution 3: Clean and Rebuild

After reinstalling API 35:

1. **Clean project**:
   ```bash
   cd android
   ./gradlew clean
   ```

2. **Invalidate caches in Android Studio**:
   - **File → Invalidate Caches → Invalidate and Restart**

3. **Rebuild**:
   ```bash
   ./gradlew bundleRelease
   ```

---

## Solution 4: Update Build Tools

Make sure you have the latest build tools:

1. **Android Studio → Tools → SDK Manager**
2. **SDK Tools** tab
3. Check **"Show Package Details"**
4. Update **"Android SDK Build-Tools"** to latest version (35.0.0 or higher)
5. Click **Apply**

---

## Quick Fix Steps

1. ✅ Open Android Studio
2. ✅ Tools → SDK Manager
3. ✅ SDK Platforms → Uncheck API 35 → Apply
4. ✅ SDK Platforms → Check API 35 → Apply (reinstall)
5. ✅ SDK Tools → Update Build Tools to latest
6. ✅ Clean project: `./gradlew clean`
7. ✅ Rebuild: `./gradlew bundleRelease`

---

## If Still Failing

If API 35 continues to fail after reinstalling:

1. **Check Android Studio version**: Make sure you have the latest Android Studio
2. **Update Android Studio**: Help → Check for Updates
3. **Try API 34 temporarily** to verify the build works, then upgrade to 35

---

**Most likely fix: Reinstall API 35 via SDK Manager! 🔧**
