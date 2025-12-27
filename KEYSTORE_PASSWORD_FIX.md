# Keystore Password Fix

## The Issue
Keystore file is found, but password is incorrect.

## What I Changed
For `.p12` files, sometimes both passwords need to be the same. I've updated `keystore.properties` to use the same password for both `storePassword` and `keyPassword`.

## Try Building Now
```bash
./gradlew clean
./gradlew bundleRelease
```

## If Still Fails

### Option 1: Try Swapped Passwords
If it still fails, the passwords might be swapped. Update `android/keystore.properties`:
```
storePassword=c6f4c838bfb5b92572e512767664b36a
keyPassword=af8e7fa27ca269ab98bd7c8b539869b7
keyAlias=b0e5bbb3083c209742c42c924bb5ceca
storeFile=gosafezw__gosafe-keystore.bak.p12
```

### Option 2: Verify with Keytool
Test which password works:
```powershell
keytool -list -v -keystore "android\app\gosafezw__gosafe-keystore.bak.p12" -storetype PKCS12
```

Try:
1. Password: `af8e7fa27ca269ab98bd7c8b539869b7`
2. Password: `c6f4c838bfb5b92572e512767664b36a`

Whichever one works is the correct password.

---

**Try building first with the updated passwords!**
