# Fix Android SDK Corruption

## The Problem
The entire Android SDK is corrupted, not just API 35. This is why you can't install anything.

---

## Solution 1: Reinstall Android SDK (Recommended)

### Step 1: Close Android Studio
**Close Android Studio completely**

### Step 2: Delete Entire SDK Folder
1. Open **File Explorer**
2. Navigate to: `C:\Users\Admin\AppData\Local\Android\`
3. **Delete the entire `Sdk` folder** (or rename it to `Sdk_backup` if you want to keep it)

### Step 3: Reopen Android Studio
```bash
npx cap open android
```

### Step 4: Let Android Studio Reinstall SDK
1. Android Studio will detect the missing SDK
2. It will prompt you to download/install the SDK
3. **Follow the prompts** to install:
   - SDK location: `C:\Users\Admin\AppData\Local\Android\Sdk`
   - Install required components
   - Wait for download (may take 15-20 minutes)

### Step 5: Install API 35
1. After SDK is installed, go to **Tools → SDK Manager**
2. **SDK Platforms** tab
3. Check **"Android 15.0 (API 35)"**
4. Click **Apply**
5. Wait for installation

---

## Solution 2: Fix SDK Location in Android Studio

If Solution 1 doesn't work:

### Step 1: Check SDK Location
1. **File → Settings** (or **Preferences** on Mac)
2. **Appearance & Behavior → System Settings → Android SDK**
3. Check **"Android SDK Location"**
4. Should be: `C:\Users\Admin\AppData\Local\Android\Sdk`

### Step 2: If Path is Wrong
1. Click the folder icon next to SDK location
2. Navigate to: `C:\Users\Admin\AppData\Local\Android\Sdk`
3. Click **OK**
4. Click **Apply**

### Step 3: Install Platforms
1. In SDK Manager, go to **SDK Platforms** tab
2. Check **"Android 15.0 (API 35)"**
3. Click **Apply**

---

## Solution 3: Use Command Line SDK Manager (Advanced)

If Android Studio keeps failing:

1. **Download Android Command Line Tools**:
   - https://developer.android.com/studio#command-tools
   - Download "Command line tools only"

2. **Extract and run**:
   ```powershell
   cd C:\Users\Admin\AppData\Local\Android\Sdk\cmdline-tools\latest\bin
   .\sdkmanager.bat "platforms;android-35"
   .\sdkmanager.bat "build-tools;35.0.0"
   ```

---

## Solution 4: Fresh Android Studio Installation

If nothing works:

1. **Uninstall Android Studio**
2. **Delete SDK folder**: `C:\Users\Admin\AppData\Local\Android\Sdk`
3. **Reinstall Android Studio** from scratch
4. Let it install SDK fresh

---

## Quick Fix (Try This First)

1. **Close Android Studio**
2. **Delete**: `C:\Users\Admin\AppData\Local\Android\Sdk` (entire folder)
3. **Reopen Android Studio**
4. **Let it reinstall SDK automatically**
5. **Then install API 35**

---

## After Fixing SDK

Once SDK is working:

1. **Sync Capacitor**:
   ```bash
   npx cap sync android
   ```

2. **Build AAB**:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew bundleRelease
   ```

---

**Most likely fix: Delete entire SDK folder and let Android Studio reinstall it fresh! 🔧**
