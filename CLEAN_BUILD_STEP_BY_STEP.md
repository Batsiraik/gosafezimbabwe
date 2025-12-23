# 🧹 Clean Build - Step by Step Guide

## 📋 Complete Step-by-Step Instructions

---

## Step 1: Open Android Studio

### Option A: Using Terminal Command
```bash
npm run cap:android
```
This will automatically open Android Studio with your Android project.

### Option B: Manual Open
1. Open **Android Studio**
2. Click **File → Open**
3. Navigate to: `C:\Users\Admin\Documents\gosafezimbabwe\android`
4. Click **OK**

**Wait for Android Studio to finish loading and syncing** (may take 1-2 minutes)

---

## Step 2: Clean the Project

### In Android Studio:

1. **Click the menu bar at the top:**
   - Look for: **Build** (in the top menu)

2. **Click: Build → Clean Project**
   - You'll see a progress bar at the bottom
   - Wait for it to finish (usually 10-30 seconds)
   - You'll see: "BUILD SUCCESSFUL" in the bottom status bar

**What this does:** Deletes all compiled files and cache, forcing a fresh rebuild.

---

## Step 3: Rebuild the Project

### In Android Studio:

1. **Click: Build → Rebuild Project**
   - This will recompile ALL native code including MainActivity.java
   - You'll see progress in the bottom status bar
   - Wait for it to finish (may take 2-5 minutes)
   - You'll see: "BUILD SUCCESSFUL" when done

**What this does:** Recompiles all Java/Kotlin code, including your notification channel code.

---

## Step 4: Build the APK

### In Android Studio:

1. **Click: Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Wait for build to complete (1-3 minutes)
   - You'll see a notification: **"APK(s) generated successfully"**

2. **Click "locate" in the notification** (or manually navigate):
   - The APK is at: `android\app\build\outputs\apk\debug\app-debug.apk`

**What this does:** Creates the installable APK file with all your code and the sound file.

---

## Step 5: Uninstall Old App from Phone

### On Your Android Phone:

1. **Open Settings**
2. **Go to: Apps** (or "Applications" or "App Manager")
3. **Find: "GO SAFE"** in the list
4. **Tap on it**
5. **Tap: "Uninstall"**
6. **Confirm: "OK" or "Uninstall"**

**Why?** The old APK created a notification channel. Uninstalling deletes it so the new APK can create a fresh channel with sound.

---

## Step 6: Transfer APK to Phone

### Option A: USB Cable
1. **Connect phone to computer via USB**
2. **Enable file transfer** on phone (swipe down notification, select "File Transfer" or "MTP")
3. **Copy APK file:**
   - From: `android\app\build\outputs\apk\debug\app-debug.apk`
   - To: Your phone's Downloads folder

### Option B: Email/Cloud
1. **Email the APK to yourself**
2. **Open email on phone**
3. **Download the APK attachment**

### Option C: Google Drive/Dropbox
1. **Upload APK to cloud storage**
2. **Download on phone**

---

## Step 7: Install New APK on Phone

### On Your Android Phone:

1. **Open File Manager** (or Downloads app)
2. **Find: `app-debug.apk`**
3. **Tap on it**
4. **If prompted: "Install from unknown sources" → Allow**
5. **Tap: "Install"**
6. **Wait for installation** (10-20 seconds)
7. **Tap: "Open"** (or find GO SAFE app icon)

---

## Step 8: Test the Sound

### On Your Phone:

1. **Open the GO SAFE app**
   - This creates the notification channel with sound

2. **Go to driver dashboard**
   - Allow notifications if prompted

3. **Create a test ride request** from another account

4. **You should hear your custom MP3 sound!** 🔊

---

## 🔍 Verify It Worked

### Check Notification Channel:

1. **Settings → Apps → GO SAFE → Notifications**
2. **Tap: "GO SAFE Notifications" channel**
3. **Check "Sound"** - Should show your custom sound

### Check Sound File in APK:

The sound file should be included automatically. If you want to verify:
1. Rename `app-debug.apk` to `app-debug.zip`
2. Extract the ZIP
3. Navigate to: `res/raw/`
4. You should see `notification_sound.mp3`

---

## ⚠️ Troubleshooting

### Still No Sound?

1. **Check phone volume:**
   - Make sure notification volume is up
   - Check Do Not Disturb is off

2. **Check app notification settings:**
   - Settings → Apps → GO SAFE → Notifications
   - Make sure notifications are enabled
   - Check channel sound setting

3. **Try default sound first:**
   - Temporarily change MainActivity to use default sound
   - If default works, issue is with custom sound file
   - If default doesn't work, issue is with channel setup

4. **Re-download sound file:**
   - Delete `android/app/src/main/res/raw/notification_sound.mp3`
   - Copy your original MP3 file again
   - Clean and rebuild

---

## 📝 Quick Command Summary

```bash
# 1. Sync Capacitor (if needed)
npx cap sync android

# 2. Open Android Studio
npm run cap:android

# Then in Android Studio:
# - Build → Clean Project
# - Build → Rebuild Project  
# - Build → Build Bundle(s) / APK(s) → Build APK(s)
```

---

## ✅ Checklist

- [ ] Android Studio opened
- [ ] Clean Project completed
- [ ] Rebuild Project completed
- [ ] APK built successfully
- [ ] Old app uninstalled from phone
- [ ] New APK transferred to phone
- [ ] New APK installed
- [ ] App opened (creates channel)
- [ ] Test notification sent
- [ ] Sound plays! 🔊

---

**Follow these steps exactly and your custom sound will work!** 🎵
