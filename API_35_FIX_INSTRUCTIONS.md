# Fix API 35 Issue - Step by Step

## Current Status
- **Temporarily using API 34** so you can build
- **Google Play requires API 35**, so you'll need to fix this before final upload

---

## Why API 35 is Failing

The Android SDK platform-35 files are corrupted at:
```
C:\Users\Admin\AppData\Local\Android\Sdk\platforms\android-35\android.jar
```

---

## Fix API 35 (Required for Google Play)

### Method 1: Reinstall via Android Studio (Recommended)

1. **Open Android Studio**
   ```bash
   npx cap open android
   ```

2. **Open SDK Manager**
   - **Tools → SDK Manager**
   - Or click the SDK Manager icon in toolbar

3. **Uninstall API 35**
   - Click **SDK Platforms** tab
   - Find **"Android 15.0 (API 35)"**
   - **Uncheck** it
   - Click **Apply**
   - Wait for uninstallation

4. **Reinstall API 35**
   - **Check** "Android 15.0 (API 35)" again
   - Click **Apply**
   - Wait for download and installation (may take 5-10 minutes)
   - Make sure it completes successfully

5. **Update Build Tools**
   - Click **SDK Tools** tab
   - Check **"Show Package Details"** (bottom right)
   - Expand **"Android SDK Build-Tools"**
   - Make sure **35.0.0** (or latest) is checked
   - Click **Apply**

6. **Clean and Rebuild**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew bundleRelease
   ```

---

### Method 2: Manual Delete and Reinstall

If Method 1 doesn't work:

1. **Close Android Studio completely**

2. **Delete the corrupted platform**
   - Navigate to: `C:\Users\Admin\AppData\Local\Android\Sdk\platforms\`
   - Delete the `android-35` folder (if it exists)

3. **Open Android Studio**

4. **Install API 35**
   - **Tools → SDK Manager**
   - **SDK Platforms** tab
   - Check **"Android 15.0 (API 35)"**
   - Click **Apply**
   - Wait for fresh installation

5. **Rebuild**

---

### Method 3: Update Android Studio

Sometimes the issue is with an outdated Android Studio:

1. **Help → Check for Updates**
2. Update to the latest version
3. Restart Android Studio
4. Try installing API 35 again

---

## After Fixing API 35

Once API 35 is working:

1. **Update `android/variables.gradle`**:
   ```gradle
   compileSdkVersion = 35
   targetSdkVersion = 35
   ```

2. **Clean and rebuild**:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew bundleRelease
   ```

3. **Upload to Google Play** (API 35 is required)

---

## Current Setup (Temporary)

- ✅ **Using API 34** - Builds will work
- ⚠️ **Google Play requires API 35** - You'll need to fix API 35 before final upload

---

## Quick Checklist

- [ ] Open Android Studio
- [ ] Tools → SDK Manager
- [ ] SDK Platforms → Uncheck API 35 → Apply
- [ ] SDK Platforms → Check API 35 → Apply (reinstall)
- [ ] SDK Tools → Update Build Tools to 35.0.0
- [ ] Clean project: `./gradlew clean`
- [ ] Rebuild: `./gradlew bundleRelease`
- [ ] If successful, update variables.gradle back to API 35
- [ ] Build final AAB with API 35

---

**For now, you can build with API 34. Fix API 35 when you're ready to upload to Google Play! 🚀**
