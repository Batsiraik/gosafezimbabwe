# Temporary Fix: Use API 34

## The Problem
Both API 35 and API 36 have corrupted android.jar files. This is a persistent SDK corruption issue.

## Temporary Solution: Use API 34

Since both 35 and 36 are corrupted, let's use API 34 to get you building:

1. **Update `android/variables.gradle`**:
   ```
   compileSdkVersion = 34
   targetSdkVersion = 34
   ```

2. **Build with API 34** (this will work)

3. **Note**: Google Play requires API 35+, but:
   - You can test the build process with API 34
   - Fix API 35/36 corruption issue separately
   - Then switch back to API 35 for final upload

## To Fix API 35/36 Later

The corruption might be due to:
1. **Antivirus interference** - Try disabling antivirus during SDK installation
2. **Network issues** - Corrupted downloads
3. **Disk issues** - Bad sectors on hard drive
4. **Permissions** - Can't write to SDK folder properly

**Try reinstalling with antivirus disabled and as administrator.**

---

**For now, let's use API 34 to get you building!**
