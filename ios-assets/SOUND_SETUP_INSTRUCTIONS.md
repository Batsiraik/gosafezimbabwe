# iOS Notification Sound - Setup Instructions

## 🔊 Sound File Format

iOS supports:
- ✅ `.caf` (preferred, native iOS format)
- ✅ `.mp3` (also works)
- ✅ `.aiff` (also works)

## 🚀 Quick Setup

### Option 1: Use MP3 (Easiest)

1. If you have the original MP3 file, copy it to:
   - `ios-assets/sounds/notification_sound.mp3`
2. ✅ Done! iOS can use MP3 directly.

### Option 2: Convert to CAF (Recommended)

1. Use online converter: [CloudConvert MP3 to CAF](https://cloudconvert.com/mp3-to-caf)
2. Upload your MP3 file
3. Convert to CAF format
4. Download and save to: `ios-assets/sounds/notification_sound.caf`

### Option 3: Use FFmpeg (If Installed)

```bash
ffmpeg -i notification_sound.mp3 -f caf notification_sound.caf
```

## 📁 Current File

Your Android sound file is copied to: `ios-assets/sounds/notification_sound.ogg`

**Note**: iOS doesn't support OGG, so you'll need to convert to MP3 or CAF.

## ✅ Done!

The sound file will be added to Xcode project on MacBook and referenced in the notification code.
