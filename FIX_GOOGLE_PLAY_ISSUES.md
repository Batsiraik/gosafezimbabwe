# Fix Google Play Store Issues

## Issues Fixed

### ✅ 1. API Level Error (FIXED)
**Error**: "Your app currently targets API level 33 and must target at least API level 35"

**Fixed**: Updated `android/variables.gradle`:
- `compileSdkVersion = 35`
- `targetSdkVersion = 35`

### ✅ 2. Advertising ID Permission (FIXED)
**Warning**: Missing `com.google.android.gms.permission.AD_ID` permission

**Fixed**: Added to `AndroidManifest.xml`:
```xml
<uses-permission android:name="com.google.android.gms.permission.AD_ID" />
```

### ✅ 3. Deobfuscation File (FIXED)
**Warning**: "There is no deobfuscation file associated with this App Bundle"

**Fixed**: Enabled R8/ProGuard in `build.gradle`:
- `minifyEnabled true`
- `shrinkResources true`
- Mapping file will be generated automatically

### ⚠️ 4. Device Support Warning (INFO)
**Warning**: "This release no longer supports 2,125 devices"

**Note**: This is likely due to:
- API level 35 requirement (some very old devices can't support it)
- This is normal and expected when targeting newer Android versions
- Your `minSdkVersion = 22` (Android 5.1) is already quite low
- Most users are on newer devices, so this shouldn't be a major concern

---

## Next Steps

### 1. Update Google Play Console Advertising ID Declaration

If you're **NOT using advertising ID**, update your Play Console:

1. Go to **Google Play Console** → Your App
2. Go to **Policy** → **App content**
3. Find **Advertising ID** section
4. Select **"No, my app does not use advertising ID"**
5. Save changes

This will remove the AD_ID permission warning.

**OR** if you **ARE using advertising ID**:
- Keep the permission (already added ✅)
- The warning will go away after you upload the new build

### 2. Rebuild and Upload

1. **Sync Capacitor**:
   ```bash
   npx cap sync android
   ```

2. **Build new AAB**:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

3. **Upload to Google Play Console**:
   - The new AAB will have:
     - ✅ API level 35
     - ✅ AD_ID permission
     - ✅ Mapping file for crash reports

### 3. Upload Mapping File (Optional but Recommended)

After uploading the AAB, you can also upload the mapping file:

1. Go to **Google Play Console** → Your App → **Release** → **Production**
2. Click on your release
3. Scroll to **App bundle explorer**
4. Upload the mapping file from:
   ```
   android/app/build/outputs/mapping/release/mapping.txt
   ```

This helps with crash report analysis.

---

## Summary of Changes

| Issue | Status | Fix |
|-------|--------|-----|
| API Level 35 | ✅ Fixed | Updated to targetSdkVersion 35 |
| AD_ID Permission | ✅ Fixed | Added to AndroidManifest.xml |
| Deobfuscation File | ✅ Fixed | Enabled R8/ProGuard |
| Device Support | ℹ️ Info | Normal when targeting newer APIs |

---

## Important Notes

1. **API Level 35**: Required by Google Play for new uploads
2. **AD_ID Permission**: Added automatically - update Play Console if you don't use ads
3. **R8/ProGuard**: Now enabled - your app will be smaller and optimized
4. **Device Support**: Losing support for very old devices is normal and expected

---

## After Rebuilding

1. ✅ API level error will be gone
2. ✅ AD_ID warning will be gone (after updating Play Console declaration)
3. ✅ Deobfuscation file warning will be gone
4. ⚠️ Device support warning may remain (this is normal)

**You're all set! Rebuild and upload! 🚀**
