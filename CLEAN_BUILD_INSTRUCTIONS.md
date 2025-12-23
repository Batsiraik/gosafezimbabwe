# Clean Build Instructions for Notification Sound

## 🎵 Why Clean Build is Needed

The notification channel with custom sound is created in **native Android code** (`MainActivity.java`). This requires:
1. **Clean build** to ensure all native code is recompiled
2. **New APK** to include the updated MainActivity
3. **Fresh install** to create the notification channel with sound

---

## 🔧 Step-by-Step Clean Build

### Step 1: Clean Build in Android Studio

1. **Open Android Studio:**
   ```bash
   npm run cap:android
   ```

2. **Clean Project:**
   - Menu: **Build → Clean Project**
   - Wait for it to complete

3. **Rebuild Project:**
   - Menu: **Build → Rebuild Project**
   - This recompiles all native code including MainActivity.java
   - Wait for it to complete (may take a few minutes)

4. **Build APK:**
   - Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Wait for build to complete
   - You'll see: "APK(s) generated successfully"

5. **Find your APK:**
   - Click "locate" in the notification
   - Or navigate to: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 2: Uninstall Old App (Important!)

**Before installing the new APK:**

1. **On your phone:**
   - Settings → Apps → GO SAFE → Uninstall
   - This removes the old notification channel

2. **Why?** 
   - Old APK might have created a channel without sound
   - Uninstalling deletes the old channel
   - New APK will create fresh channel with sound

### Step 3: Install New APK

1. **Transfer APK to phone** (USB, email, cloud, etc.)
2. **Install APK** on phone
3. **Allow installation** from unknown sources if prompted

### Step 4: Test

1. **Open the app** (this creates the notification channel with sound)
2. **Go to driver dashboard**
3. **Allow notifications** when prompted
4. **Create a ride request** from another account
5. **You should hear the custom sound!** 🔊

---

## 🔍 Verify Sound File is in APK

After building, you can verify the sound file is included:

1. **In Android Studio:**
   - Navigate to: `android/app/build/intermediates/merged_res/debug/raw/`
   - Check if `notification_sound.mp3` is there

2. **Or check APK contents:**
   - APK is just a ZIP file
   - Rename `.apk` to `.zip`
   - Extract and check `res/raw/notification_sound.mp3` exists

---

## 🐛 If Sound Still Doesn't Work

### Check 1: Verify Channel Was Created

After installing new APK:
1. Settings → Apps → GO SAFE → Notifications
2. You should see "GO SAFE Notifications" channel
3. Tap on it → Check "Sound" setting
4. Should show "notification_sound" or custom sound

### Check 2: Test with Default Sound First

Temporarily change MainActivity to use default sound:
```java
// Use default notification sound
channel.setSound(null, null); // This uses default sound
```

If default sound works, the issue is with the custom sound file.

### Check 3: Sound File Format

- ✅ File must be MP3
- ✅ File must be under 1MB
- ✅ Filename: `notification_sound.mp3` (lowercase, no spaces)
- ✅ Location: `android/app/src/main/res/raw/notification_sound.mp3`

### Check 4: Re-download Sound File

Sometimes the file might be corrupted:
1. Delete `android/app/src/main/res/raw/notification_sound.mp3`
2. Copy your original MP3 file again
3. Clean and rebuild

---

## 📝 Quick Checklist

- [ ] Sound file exists: `android/app/src/main/res/raw/notification_sound.mp3`
- [ ] MainActivity.java has notification channel code
- [ ] Clean build completed
- [ ] Rebuild completed
- [ ] APK built successfully
- [ ] Old app uninstalled from phone
- [ ] New APK installed
- [ ] App opened (creates channel)
- [ ] Test notification sent
- [ ] Sound plays! 🔊

---

## ✅ After Clean Build

The notification channel will be created with your custom sound, and all notifications will play the MP3 file!

**Do a clean build, uninstall old app, install new APK, and test!** 🎵
