# Quick Sound Check - Step by Step

## Easiest Method: Android Studio Terminal

### 1. Open Android Studio Terminal
- Click **Terminal** tab at bottom (or **View → Tool Windows → Terminal**)

### 2. Check Device Connection
Type:
```bash
adb devices
```
**Expected:** You should see your device listed

### 3. Clear and Watch Logs
Type this (Windows):
```bash
adb logcat -c
adb logcat | findstr /i "MainActivity"
```

**Mac/Linux:**
```bash
adb logcat -c
adb logcat | grep -i "MainActivity"
```

### 4. Open App on Phone
- While the command is running, **open the GO SAFE app** on your phone
- Watch the terminal - you'll see logs appear

### 5. Look for These Lines

**✅ If you see this, sound SHOULD work:**
```
MainActivity: ✅ Sound resource found! Resource ID: [number]
MainActivity: ✅ Channel sound URI looks correct!
```

**❌ If you see this, sound WON'T work:**
```
MainActivity: ❌ Sound resource NOT found!
MainActivity: ❌ WARNING: Channel sound is NULL!
```

---

## Alternative: Check Phone Settings

1. **Settings → Apps → GO SAFE → Notifications**
2. Find **"GO SAFE Notifications"** channel
3. Tap it
4. Check **Sound** - should show your custom sound name
5. If it shows "Default" or "None" → That's the problem!

---

## Still Can't Connect?

**Try this:**
1. Unplug USB cable
2. On phone: **Settings → Developer Options → Revoke USB debugging authorizations**
3. Plug back in
4. Unlock phone - you should see "Allow USB debugging?" popup
5. Check "Always allow" and click "Allow"
6. Try `adb devices` again

---

## Share the Output

Copy and paste:
- All lines with "MainActivity" from the terminal
- What you see in phone's notification settings

This will tell us exactly what's wrong! 🔍
