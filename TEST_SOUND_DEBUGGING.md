# Testing Notification Sound - What to Check

## Step 1: Check Android Logcat (Android Studio)

When you **open the app** on your phone, immediately check Logcat for:

### ✅ Good Signs (Sound should work):
```
MainActivity: ✅ Sound resource found! Resource ID: [number]
MainActivity: ✅ Notification channel created with sound: android.resource://com.gosafeappzw.app/raw/notification_sound
MainActivity: ✅ Notification channel 'default' created successfully
```

### ❌ Bad Signs (Sound won't work):
```
MainActivity: ❌ Sound resource NOT found! Check if file exists in res/raw/
MainActivity: Error checking sound resource: [error message]
```

**How to check Logcat:**
1. Open Android Studio
2. Connect your phone via USB (with USB debugging enabled)
3. In Android Studio, open **View → Tool Windows → Logcat**
4. Filter by tag: `MainActivity`
5. Open the app on your phone
6. Look for the logs above

---

## Step 2: Send a Test Notification

### Option A: From Settings Page (Easiest)
1. Open the app
2. Go to **Settings** page
3. Click **🔔 Test Notification** button
4. Check both Logcat AND Vercel logs

### Option B: Create a Real Ride Request
1. Use another account (browser) to create a ride request
2. Make sure your driver account (on phone) is:
   - Verified ✅
   - Online ✅
   - Within 5km of pickup location ✅

---

## Step 3: Check Vercel Logs

Go to: **Vercel Dashboard → Your Project → Logs**

### Look for these log prefixes:

#### When notification is sent:
```
[FCM] Attempting to send notification to token: ...
[FCM] ✅ Successfully sent push notification. Message ID: ...
```

#### If there's an error:
```
[FCM] ❌ Error sending push notification: ...
[FCM] Error code: messaging/...
```

#### When ride request is created:
```
[RIDE CREATE] Ride request [id] created, triggering notifications...
[NOTIFICATION] Finding drivers within 5km...
[NOTIFICATION] Driver: [name] - Verified: true, Online: true, Has Token: true, Has Location: true
[NOTIFICATION] ✅ Sending notification to driver [name]
```

---

## Step 4: What to Report

If sound **still doesn't work** after converting to OGG, please share:

1. **Logcat output** (filter by `MainActivity`):
   - Copy all lines with `MainActivity:` tag
   - Especially the lines about sound resource

2. **Vercel logs** (when notification is sent):
   - Copy lines with `[FCM]` prefix
   - Copy lines with `[NOTIFICATION]` prefix

3. **File details**:
   - What format is the file? (OGG or MP3)
   - File size?
   - Where is it located? (`android/app/src/main/res/raw/notification_sound.ogg`)

4. **Phone details**:
   - Android version?
   - Phone model?
   - Is notification volume turned up?
   - Is Do Not Disturb mode OFF?

---

## Quick Checklist

- [ ] Converted MP3 to OGG format
- [ ] Placed `notification_sound.ogg` in `android/app/src/main/res/raw/`
- [ ] Deleted old `notification_sound.mp3`
- [ ] Ran `npx cap sync android`
- [ ] Cleaned build in Android Studio
- [ ] Rebuilt project
- [ ] Uninstalled old app from phone
- [ ] Installed new APK
- [ ] Checked Logcat for "✅ Sound resource found!"
- [ ] Sent test notification
- [ ] Checked Vercel logs for "[FCM] ✅ Successfully sent"
- [ ] Notification appears on phone
- [ ] Sound plays (or doesn't play - report this!)

---

## Common Issues

### Issue: "Sound resource NOT found"
**Solution:** 
- Check file name is exactly `notification_sound.ogg` (lowercase, no spaces)
- Check file is in `android/app/src/main/res/raw/` (not `res/raw/` at root)
- Run `npx cap sync android` again

### Issue: Notification appears but no sound
**Possible causes:**
1. Phone volume is muted
2. Do Not Disturb is ON
3. App notification settings on phone are set to silent
4. OGG file is corrupted (try converting again)

### Issue: Logcat shows sound found but still no sound
**Solution:**
- Check phone's notification settings for "GO SAFE" app
- Make sure sound is enabled for this app
- Try restarting the phone (sometimes Android caches notification channels)

---

## Next Steps After Testing

Once you've checked both Logcat and Vercel logs, share:
1. What you see in Logcat (especially the sound resource check)
2. What you see in Vercel logs (notification sending)
3. Whether notification appears (yes/no)
4. Whether sound plays (yes/no)

This will help diagnose the exact issue! 🔍
