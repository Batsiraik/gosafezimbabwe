# Fix API 35 Corruption - Step by Step

## The Problem
Your API 35 platform files are corrupted at:
```
C:\Users\Admin\AppData\Local\Android\Sdk\platforms\android-35\android.jar
```

Even though you installed it, the files are still corrupted.

---

## Solution: Complete Reinstall of API 35

### Step 1: Close Everything
1. **Close Android Studio completely**
2. **Close any terminal/command prompt windows**

### Step 2: Delete Corrupted API 35 Files

**Option A: Via File Explorer (Easiest)**
1. Open **File Explorer**
2. Navigate to: `C:\Users\Admin\AppData\Local\Android\Sdk\platforms\`
3. **Delete the entire `android-35` folder** (if it exists)
4. Also check: `C:\Users\Admin\AppData\Local\Android\Sdk\platform-tools\` (don't delete this, just check)

**Option B: Via Command Line**
```powershell
Remove-Item -Path "C:\Users\Admin\AppData\Local\Android\Sdk\platforms\android-35" -Recurse -Force
```

### Step 3: Open Android Studio

```bash
npx cap open android
```

### Step 4: Fresh Install API 35

1. In Android Studio: **Tools → SDK Manager**
2. Click **SDK Platforms** tab
3. **Uncheck** "Android 15.0 (API 35)" (if checked)
4. Click **Apply** (this ensures it's completely removed)
5. Wait for uninstallation to complete
6. **Check** "Android 15.0 (API 35)" again
7. Click **Apply** (this downloads and installs fresh files)
8. **Wait for complete download and installation** (may take 5-10 minutes)
9. Make sure you see "Installed" status

### Step 5: Update Build Tools

1. Still in SDK Manager, click **SDK Tools** tab
2. Check **"Show Package Details"** (bottom right)
3. Expand **"Android SDK Build-Tools"**
4. Make sure **35.0.0** (or latest) is checked
5. Click **Apply**

### Step 6: Verify Installation

Check that the files exist and are not corrupted:
```
C:\Users\Admin\AppData\Local\Android\Sdk\platforms\android-35\android.jar
```

The file should exist and be a reasonable size (usually 50-100MB).

### Step 7: Clean and Rebuild

```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

---

## Alternative: Use API 34 Temporarily

If API 35 keeps failing, you can use API 34 to build now, then fix API 35 later:

1. Update `android/variables.gradle`:
   ```
   compileSdkVersion = 34
   targetSdkVersion = 34
   ```

2. Build with API 34 (will work)

3. **Note**: Google Play requires API 35, so you'll need to fix it eventually, but this lets you test the build process.

---

## If Still Failing After Reinstall

1. **Update Android Studio**:
   - Help → Check for Updates
   - Update to latest version
   - Restart

2. **Check Internet Connection**:
   - Make sure download completes fully
   - Don't interrupt the download

3. **Try Different SDK Location**:
   - Sometimes SDK location can cause issues
   - Consider moving SDK to a different path

---

## Quick Checklist

- [ ] Closed Android Studio
- [ ] Deleted `android-35` folder manually
- [ ] Opened Android Studio
- [ ] SDK Manager → Unchecked API 35 → Applied
- [ ] SDK Manager → Checked API 35 → Applied (fresh install)
- [ ] Updated Build Tools to 35.0.0
- [ ] Verified android.jar exists
- [ ] Cleaned project: `./gradlew clean`
- [ ] Rebuilt: `./gradlew bundleRelease`

---

**The key is to DELETE the corrupted folder FIRST, then reinstall fresh! 🔧**
