# Verify Keystore Credentials

## The Issue
Keystore file is found, but password is incorrect.

## Your Credentials (from earlier)
- **Keystore password**: `af8e7fa27ca269ab98bd7c8b539869b7`
- **Key alias**: `b0e5bbb3083c209742c42c924bb5ceca`
- **Key password**: `c6f4c838bfb5b92572e512767664b36a`

## For .p12 Files

`.p12` (PKCS#12) files sometimes use:
- **Same password** for both store and key
- **OR different passwords** for store and key

## Verify Your Keystore

You can verify the keystore using Java keytool:

```powershell
keytool -list -v -keystore "C:\Users\Admin\Documents\gosafezimbabwe\android\app\gosafezw__gosafe-keystore.bak.p12" -storetype PKCS12
```

This will prompt for the password. Try:
1. First try the **store password**: `af8e7fa27ca269ab98bd7c8b539869b7`
2. If that doesn't work, try the **key password**: `c6f4c838bfb5b92572e512767664b36a`
3. If neither works, the keystore file might be corrupted or the passwords are wrong

## Common Issues

1. **Passwords swapped**: Try swapping storePassword and keyPassword
2. **Same password**: For .p12, sometimes both passwords are the same
3. **Wrong keystore file**: Make sure you're using the correct .p12 file
4. **Corrupted file**: The .p12 file might be corrupted

## Quick Test

Try updating `keystore.properties` to use the same password for both:

```
storePassword=af8e7fa27ca269ab98bd7c8b539869b7
keyPassword=af8e7fa27ca269ab98bd7c8b539869b7
keyAlias=b0e5bbb3083c209742c42c924bb5ceca
storeFile=gosafezw__gosafe-keystore.bak.p12
```

Or try swapping them:

```
storePassword=c6f4c838bfb5b92572e512767664b36a
keyPassword=af8e7fa27ca269ab98bd7c8b539869b7
keyAlias=b0e5bbb3083c209742c42c924bb5ceca
storeFile=gosafezw__gosafe-keystore.bak.p12
```

---

**Try the keytool command first to verify which password works!**
