# 🔧 Fix: Invalid FCM Token Error

## 🚨 Error Message

```
[FCM] ❌ Error sending push notification: Error: The registration token is not a valid FCM registration token
Error code: messaging/invalid-argument
```

## 🔍 What This Means

The FCM token stored in your database is **not a valid Firebase Cloud Messaging token**. This could happen if:

1. **Token is from wrong Firebase project** - Token was generated for a different project
2. **Token is corrupted** - Token was truncated or modified during storage
3. **Token is expired/invalid** - Token is old and no longer valid
4. **Token format is wrong** - Token doesn't match FCM format

---

## ✅ Solution: Get Fresh Token from App

### Step 1: Clear Old Token from Database

```sql
-- Find the invalid token
SELECT id, "fullName", phone, "pushToken", LENGTH("pushToken") as token_length
FROM users 
WHERE phone = 'DRIVER_PHONE_NUMBER';

-- Clear the invalid token (optional, will be replaced when app opens)
UPDATE users 
SET "pushToken" = NULL 
WHERE phone = 'DRIVER_PHONE_NUMBER';
```

### Step 2: Get Fresh Token from App

1. **Open the app on your phone** (as the driver account)
2. **Go to dashboard** - This will trigger push notification registration
3. **Allow notifications** when prompted
4. **Check Vercel logs** for: `[PUSH TOKEN] ✅ Token stored successfully`

The app will automatically:
- Request notification permissions
- Get a fresh FCM token from Firebase
- Store it in the database

### Step 3: Verify New Token

```sql
-- Check the new token
SELECT id, "fullName", phone, 
       "pushToken", 
       LENGTH("pushToken") as token_length,
       LEFT("pushToken", 20) as token_start,
       RIGHT("pushToken", 10) as token_end
FROM users 
WHERE phone = 'DRIVER_PHONE_NUMBER';
```

**Valid FCM token should:**
- Be 100-200 characters long
- Start with alphanumeric characters
- Not contain spaces or special characters (except `-`, `_`)

### Step 4: Test with New Token

Use the test endpoint with the fresh token, or create a new ride request.

---

## 🔍 Diagnostic: Check Current Token

Run this query to see what token is stored:

```sql
SELECT 
  u."fullName",
  u.phone,
  u."pushToken",
  LENGTH(u."pushToken") as token_length,
  CASE 
    WHEN u."pushToken" IS NULL THEN '❌ No Token'
    WHEN LENGTH(u."pushToken") < 100 THEN '❌ Token Too Short'
    WHEN LENGTH(u."pushToken") > 200 THEN '❌ Token Too Long'
    ELSE '✅ Token Length OK'
  END as token_status
FROM users u
WHERE u.phone = 'DRIVER_PHONE_NUMBER';
```

---

## 🛠️ Common Issues

### Issue: Token is "YOUR_FCM_TOKEN" (placeholder)

**Problem**: The token stored is literally the text "YOUR_FCM_TOKEN" instead of an actual token.

**Fix**: 
1. Clear the token: `UPDATE users SET "pushToken" = NULL WHERE phone = '...'`
2. Open app and let it generate a real token

### Issue: Token is from different Firebase project

**Problem**: Token was generated before you updated the Firebase project.

**Fix**: 
1. Clear token from database
2. Rebuild APK with correct `google-services.json`
3. Open app to get new token

### Issue: Token is truncated

**Problem**: Token was cut off during storage (less than 100 chars).

**Fix**: 
1. Check database column size (should be TEXT/VARCHAR with enough length)
2. Clear and regenerate token

---

## 📝 Next Steps

1. **Clear the invalid token** from database
2. **Open the app** on your phone (as driver)
3. **Go to dashboard** to trigger token registration
4. **Check Vercel logs** to confirm token was stored
5. **Test notification** again

The token should be automatically refreshed when the app opens! 🔄
