# Convert MP3 to OGG for Android Notifications

## Why OGG?
Android notifications work **much better** with OGG format than MP3. Many MP3 files that play fine on PC won't work in Android notifications due to codec compatibility issues.

## Quick Conversion Steps

### Option 1: Online Converter (Easiest)
1. Go to https://convertio.co/mp3-ogg/ or https://cloudconvert.com/mp3-to-ogg
2. Upload your `notification_sound.mp3` file
3. Convert to OGG format
4. Download the converted file
5. Rename it to `notification_sound.ogg`
6. Place it in `android/app/src/main/res/raw/notification_sound.ogg`
7. **Delete** the old `notification_sound.mp3` file
8. Rebuild the app

### Option 2: Using FFmpeg (Command Line)
If you have FFmpeg installed:

```bash
ffmpeg -i notification_sound.mp3 -codec:a libvorbis -qscale:a 5 notification_sound.ogg
```

Then:
1. Move `notification_sound.ogg` to `android/app/src/main/res/raw/`
2. Delete `notification_sound.mp3`
3. Rebuild the app

### Option 3: Using Audacity (Free Audio Editor)
1. Download Audacity: https://www.audacityteam.org/
2. Open your `notification_sound.mp3` in Audacity
3. Go to **File → Export → Export as OGG**
4. Choose these settings:
   - **Quality**: 5 (good balance)
   - **Bit Rate**: 128 kbps
5. Save as `notification_sound.ogg`
6. Place it in `android/app/src/main/res/raw/`
7. Delete the old MP3 file
8. Rebuild the app

## After Conversion

1. **Sync Android**: `npx cap sync android`
2. **Clean Build**: In Android Studio, go to **Build → Clean Project**
3. **Rebuild**: **Build → Rebuild Project**
4. **Uninstall old app** from your phone
5. **Install new APK**

## Verify the File

After placing the OGG file, check:
- File is in: `android/app/src/main/res/raw/notification_sound.ogg`
- File name is **exactly** `notification_sound.ogg` (lowercase, no spaces)
- Old MP3 file is deleted

## Test

After rebuilding and installing:
1. Send a test notification
2. Check Android Studio Logcat for:
   - `✅ Sound resource found! Resource ID: [number]`
   - `✅ Notification channel created with sound: android.resource://...`

If you see these logs, the sound should work! 🎵
