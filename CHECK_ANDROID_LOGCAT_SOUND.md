# How to Check Android Logcat for Sound Issues

## Step-by-Step Guide

### 1. Connect Your Phone
- Connect your phone to your computer via USB
- Enable **USB Debugging** on your phone (if not already enabled)
- In Android Studio, you should see your device appear in the device dropdown

### 2. Open Logcat in Android Studio
1. Open Android Studio
2. At the bottom, click the **"Logcat"** tab (or go to **View → Tool Windows → Logcat**)
3. If Logcat is not visible, go to **View → Tool Windows → Logcat**

### 3. Filter for Sound-Related Logs

#### Option A: Filter by Tag (Easiest)
In the Logcat search box, type:
```
tag:MainActivity
```

This will show only logs from our MainActivity where we check for the sound file.

#### Option B: Filter by Text
In the Logcat search box, type:
```
notification_sound
```

Or search for:
```
Sound resource
```

### 4. Clear Logcat and Open App
1. Click the **trash icon** (Clear Logcat) to clear old logs
2. **Unlock your phone** and **open the GO SAFE app**
3. Watch Logcat immediately - you should see logs appear

### 5. What to Look For

#### ✅ GOOD - Sound File Found:
```
MainActivity: ✅ Sound resource found! Resource ID: 2131755008
MainActivity: ✅ Notification channel created with sound: android.resource://com.gosafeappzw.app/raw/notification_sound
MainActivity: ✅ Notification channel 'default' created successfully
```

#### ❌ BAD - Sound File NOT Found:
```
MainActivity: ❌ Sound resource NOT found! Check if file exists in res/raw/
MainActivity: Using default notification sound as fallback
```

#### ⚠️ ERROR - Something Wrong:
```
MainActivity: Error checking sound resource: [error message]
MainActivity: Error creating sound URI: [error message]
```

### 6. When You Send a Notification
After you send a test notification, also look for:
- Any errors related to sound
- Any warnings about notification channels
- Any audio-related errors

---

## What to Share With Me

Please copy and paste **ALL** logs that contain:
- `MainActivity`
- `notification_sound`
- `Sound resource`
- `Notification channel`

Even if they look good or bad, share them all so I can see exactly what's happening!

---

## Quick Checklist

- [ ] Phone connected via USB
- [ ] USB Debugging enabled
- [ ] Android Studio open
- [ ] Logcat tab visible
- [ ] Filter set to `tag:MainActivity` or `notification_sound`
- [ ] Logcat cleared
- [ ] App opened on phone
- [ ] Logs captured and copied

---

## Alternative: Check via ADB (Command Line)

If you prefer command line, you can also run:

```bash
adb logcat | grep -i "MainActivity\|notification_sound\|Sound resource"
```

This will show only relevant logs in real-time.

---

## Next Steps

Once you have the Logcat output, share it with me and I'll be able to tell you exactly why the sound isn't playing! 🔍
