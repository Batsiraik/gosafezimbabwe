# Build Release AAB for Google Play Store

## Prerequisites

✅ **Keystore file placed**: `android/app/upload-keystore.jks`  
✅ **Version updated**: versionCode 51, versionName 5.0.1  
✅ **Keystore properties**: `android/keystore.properties` created

---

## Step 1: Place Your Keystore File

**IMPORTANT:** Place your JKS file in the correct location:

1. Copy your JKS file to: `android/app/upload-keystore.jks`
2. Make sure the filename matches what's in `keystore.properties` (currently `upload-keystore.jks`)

**If your JKS file has a different name:**
- Either rename it to `upload-keystore.jks`
- Or update `android/keystore.properties` to use your filename

---

## Step 2: Sync Capacitor

```bash
npx cap sync android
```

This ensures all web assets are copied to the Android project.

---

## Step 3: Open in Android Studio

```bash
npx cap open android
```

Or manually open: `android/` folder in Android Studio

---

## Step 4: Build Release AAB

### Option A: Using Android Studio (Recommended)

1. In Android Studio, go to **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Click **Next**
4. Select your keystore:
   - **Key store path**: `android/app/upload-keystore.jks`
   - **Key store password**: `af8e7fa27ca269ab98bd7c8b539869b7`
   - **Key alias**: `b0e5bbb3083c209742c42c924bb5ceca`
   - **Key password**: `c6f4c838bfb5b92572e512767664b36a`
5. Click **Next**
6. Select **release** build variant
7. Click **Create**
8. The AAB file will be created at: `android/app/release/app-release.aab`

### Option B: Using Command Line

```bash
cd android
./gradlew bundleRelease
```

The AAB file will be at: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Step 5: Verify the AAB

Before uploading, verify:
- ✅ File size is reasonable (usually 20-50MB)
- ✅ File extension is `.aab` (not `.apk`)
- ✅ Version code is 51
- ✅ Version name is 5.0.1

---

## Step 6: Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Production** (or **Testing** → **Internal testing** for testing)
4. Click **Create new release**
5. Upload the AAB file: `android/app/release/app-release.aab`
6. Fill in release notes
7. Review and roll out

---

## Troubleshooting

### Error: "Keystore file not found"
- **Solution**: Make sure `upload-keystore.jks` is in `android/app/` folder
- Check the filename matches `keystore.properties`

### Error: "Wrong password"
- **Solution**: Double-check the passwords in `keystore.properties`
- Make sure there are no extra spaces

### Error: "Key alias not found"
- **Solution**: Verify the key alias in `keystore.properties` matches your keystore

### Build fails with signing errors
- **Solution**: 
  1. Clean build: **Build → Clean Project**
  2. Rebuild: **Build → Rebuild Project**
  3. Try building AAB again

---

## Next Update

For future updates:
1. Increment `versionCode` in `android/app/build.gradle` (52, 53, etc.)
2. Update `versionName` (5.0.2, 5.1.0, etc.)
3. Build new AAB
4. Upload to Google Play Console

---

## Security Note

⚠️ **IMPORTANT**: The `keystore.properties` file contains sensitive credentials. 

**DO NOT commit it to Git!**

Make sure `.gitignore` includes:
```
android/keystore.properties
*.jks
*.keystore
```

---

## Quick Checklist

- [ ] JKS file placed in `android/app/upload-keystore.jks`
- [ ] `keystore.properties` created with correct credentials
- [ ] `build.gradle` updated with signing config
- [ ] Version code updated to 51
- [ ] Version name updated to 5.0.1
- [ ] Synced Capacitor (`npx cap sync android`)
- [ ] Built release AAB
- [ ] Verified AAB file
- [ ] Uploaded to Google Play Console

---

**You're all set! 🚀**
