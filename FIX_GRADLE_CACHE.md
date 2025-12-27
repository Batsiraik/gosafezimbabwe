# Fix Gradle Cache Issue

## The Problem
Gradle cache is corrupted after updating Gradle version.

## Solution: Clear Gradle Cache

### Step 1: Stop Gradle Daemon
```bash
cd android
./gradlew --stop
```

### Step 2: Delete Gradle Cache
```bash
# Delete project build cache
Remove-Item -Recurse -Force android\.gradle
Remove-Item -Recurse -Force android\app\.gradle
Remove-Item -Recurse -Force android\app\build
```

### Step 3: Clean Build
```bash
./gradlew clean --no-daemon
./gradlew bundleRelease --no-daemon
```

---

## Alternative: Delete Global Gradle Cache

If project cache doesn't work:

1. **Close Android Studio**
2. **Delete**: `C:\Users\Admin\.gradle\caches\`
3. **Reopen and rebuild**

---

**Try the commands above to clear the cache!**
