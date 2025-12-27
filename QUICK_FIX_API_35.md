# Quick Fix: API 35 Corruption

## The Problem
API 35 files are corrupted even after installation.

## Solution: Delete and Reinstall

### Step 1: Close Android Studio
**Close Android Studio completely**

### Step 2: Delete Corrupted Files
Open **File Explorer** and navigate to:
```
C:\Users\Admin\AppData\Local\Android\Sdk\platforms\
```

**Delete the entire `android-35` folder**

### Step 3: Reinstall API 35
1. **Open Android Studio**: `npx cap open android`
2. **Tools → SDK Manager**
3. **SDK Platforms** tab
4. **Check** "Android 15.0 (API 35)"
5. **Click Apply**
6. **Wait for complete download** (5-10 minutes)
7. Make sure it says "Installed"

### Step 4: Update Build Tools
1. **SDK Tools** tab
2. **Show Package Details**
3. **Android SDK Build-Tools** → Check **35.0.0**
4. **Click Apply**

### Step 5: Rebuild
```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

---

## If Still Failing

Try using API 34 temporarily (I can switch it back):
- API 34 will build successfully
- You can fix API 35 later
- Google Play requires API 35, so you'll need to fix it eventually

---

**The key: DELETE the corrupted folder FIRST, then reinstall! 🔧**
