# Check Sound Issue via ADB Command Line

## Step 1: Check if Device is Connected

Open **Command Prompt** (Windows) or **Terminal** (Mac/Linux) and run:

```bash
adb devices
```

**Expected output:**
```
List of devices attached
ABC123XYZ    device
```

If you see `device`, your phone is connected! ✅

If you see `unauthorized`, you need to:
1. Unlock your phone
2. Look for a popup asking "Allow USB debugging?"
3. Check "Always allow from this computer"
4. Click "Allow"

If you see `no devices`, try:
- Unplug and replug USB cable
- Enable USB Debugging in phone settings
- Try a different USB cable/port

---

## Step 2: Clear Old Logs and Watch in Real-Time

Run this command to see **only** MainActivity logs in real-time:

```bash
adb logcat -c && adb logcat | findstr /i "MainActivity notification_sound Sound Channel"
```

**For Mac/Linux:**
```bash
adb logcat -c && adb logcat | grep -i "MainActivity\|notification_sound\|Sound\|Channel"
```

**What this does:**
- `adb logcat -c` - Clears old logs
- `adb logcat` - Shows new logs in real-time
- `findstr /i` or `grep -i` - Filters for relevant keywords (case-insensitive)

---

## Step 3: Open the App

While the command is running:
1. **Open the GO SAFE app** on your phone
2. Watch the terminal/command prompt
3. You should see logs appear immediately

---

## Step 4: What to Look For

### ✅ GOOD Signs:
```
MainActivity: ✅ Sound resource found! Resource ID: 2131755008
MainActivity: ✅ Notification channel created with sound: android.resource://...
MainActivity: ✅ Notification channel 'default' created successfully
MainActivity: Channel verification:
MainActivity:   - Sound URI: android.resource://com.gosafeappzim.app/raw/notification_sound
MainActivity: ✅ Channel sound URI looks correct!
```

### ❌ BAD Signs:
```
MainActivity: ❌ Sound resource NOT found!
MainActivity: ❌ WARNING: Channel sound is NULL!
MainActivity: ⚠️ WARNING: Channel sound URI doesn't contain 'notification_sound'
```

---

## Step 5: Send Test Notification

While still watching the logs:
1. Go to Settings in the app
2. Click "🔔 Test Notification"
3. Watch for any additional errors

---

## Alternative: Save Logs to File

If you want to save the logs to a file for later review:

```bash
adb logcat -c
adb logcat > sound_debug.log
```

Then:
1. Open the app
2. Send a test notification
3. Press `Ctrl+C` to stop logging
4. Open `sound_debug.log` and search for "MainActivity"

---

## Check Notification Channel Settings

You can also check the notification channel directly:

```bash
adb shell dumpsys notification | findstr /i "default gosafe"
```

This will show the actual notification channel settings on your device.

---

## If ADB Doesn't Work

If `adb devices` shows nothing, try:

1. **Install ADB separately:**
   - Download Android Platform Tools: https://developer.android.com/tools/releases/platform-tools
   - Extract and add to PATH

2. **Or use Android Studio's Terminal:**
   - In Android Studio, go to **View → Tool Windows → Terminal**
   - Run the same `adb` commands there

---

## Quick Test Commands

Run these one by one:

```bash
# 1. Check device connection
adb devices

# 2. Clear logs
adb logcat -c

# 3. Watch logs (keep this running)
adb logcat | findstr /i "MainActivity"

# 4. In another terminal, send a test notification trigger
# (Open app and click test button while watching logs)
```

---

## Share the Output

Copy and paste **ALL** the logs that appear when you:
1. Open the app
2. Send a test notification

This will help diagnose the exact issue! 🔍
