# 🔍 Notification Debugging Guide

## 🚨 Problem: Notifications Not Received

If drivers aren't receiving notifications when ride requests are created, follow these steps:

---

## Step 1: Check Diagnostic Endpoint

### For the Driver Account:

1. **Get the driver's JWT token** (from app localStorage or database)
2. **Call the diagnostic endpoint:**

```bash
GET https://gosafezimbabwe.vercel.app/api/notifications/diagnose
Headers:
  Authorization: Bearer DRIVER_JWT_TOKEN
```

Or use this URL in browser (replace `YOUR_TOKEN`):
```
https://gosafezimbabwe.vercel.app/api/notifications/diagnose
```

**What to check:**
- ✅ `user.hasPushToken` - Should be `true`
- ✅ `driver.isOnline` - Should be `true`
- ✅ `driver.isVerified` - Should be `true`
- ✅ `driver.hasLocation` - Should be `true`
- ✅ `firebase.initialized` - Should be `true`

---

## Step 2: Check Vercel Logs

1. **Go to Vercel Dashboard**
2. **Select your project** → **Deployments** → **Latest deployment**
3. **Click "Functions" tab**
4. **Look for logs with `[NOTIFICATION]` or `[FCM]` prefix**

### What to look for:

**When a ride request is created, you should see:**
```
[NOTIFICATION] ===== Starting notification for ride request xxx =====
[NOTIFICATION] Finding taxi drivers within 5km of (lat, lng)
[NOTIFICATION] Found X online taxi drivers with push tokens
[NOTIFICATION] Driver John Doe is X.XX km away
[NOTIFICATION] ✅ Driver John Doe (phone) is within range
[NOTIFICATION] Total drivers in range: X
[NOTIFICATION] Sending to user John Doe (phone), token: xxx...
[FCM] Attempting to send notification to token: xxx...
[FCM] ✅ Firebase Admin initialized successfully
[FCM] Sending message to FCM...
[FCM] ✅ Successfully sent push notification. Message ID: xxx
```

**If you see errors:**
- `[FCM] ❌ Firebase Admin not initialized` → Check `FIREBASE_SERVICE_ACCOUNT` in Vercel
- `[NOTIFICATION] ⚠️ No drivers found within 5km` → Driver might be offline or too far
- `[NOTIFICATION] User has no push token` → Driver hasn't allowed notifications
- `[FCM] ❌ Invalid or unregistered token` → Token expired, needs refresh

---

## Step 3: Common Issues & Fixes

### Issue 1: "No drivers found within 5km"

**Check:**
- Is driver **online** in the app? (`isOnline: true`)
- Does driver have **location data**? (`currentLat` and `currentLng` not null)
- Is driver **verified**? (`isVerified: true`)
- Is driver within **5km** of pickup location?

**Fix:**
- Make sure driver toggles "Online" in driver dashboard
- Make sure app has location permissions
- Check driver's current location in database

### Issue 2: "User has no push token"

**Check:**
- Did driver allow notification permissions?
- Is push token stored in database?

**Fix:**
- Open app → Go to dashboard → Allow notifications when prompted
- Check database: `SELECT "pushToken" FROM users WHERE id = 'driver-user-id'`

### Issue 3: "Firebase Admin not initialized"

**Check:**
- Is `FIREBASE_SERVICE_ACCOUNT` set in Vercel?
- Is the JSON valid?

**Fix:**
- Go to Vercel → Settings → Environment Variables
- Verify `FIREBASE_SERVICE_ACCOUNT` exists
- Make sure it's a valid JSON string
- Redeploy if needed

### Issue 4: "Invalid or unregistered token"

**Check:**
- Token might be expired
- App might have been uninstalled/reinstalled

**Fix:**
- Token should auto-refresh when app opens
- Driver needs to open app again to get new token

---

## Step 4: Test Notification Manually

### Option A: Use Test Endpoint

1. **Get driver's JWT token** (from diagnostic endpoint or database)
2. **Call test endpoint:**

```bash
POST https://gosafezimbabwe.vercel.app/api/test-notification
Headers:
  Authorization: Bearer DRIVER_JWT_TOKEN
```

### Option B: Check Database Directly

```sql
-- Check if driver has push token
SELECT u."fullName", u.phone, u."pushToken", 
       d."isOnline", d."isVerified", d."currentLat", d."currentLng"
FROM users u
LEFT JOIN drivers d ON d."userId" = u.id
WHERE u.phone = 'DRIVER_PHONE_NUMBER';
```

---

## Step 5: Real-Time Debugging

### Add to Vercel Logs Monitoring:

1. **Watch logs in real-time:**
   - Vercel Dashboard → Your project → Functions
   - Filter by: `[NOTIFICATION]` or `[FCM]`

2. **Create a ride request** from another account
3. **Watch the logs** to see exactly where it fails

---

## 📊 Diagnostic Checklist

Run through this checklist for the driver account:

- [ ] Driver has push token in database (`pushToken IS NOT NULL`)
- [ ] Driver is online (`isOnline = true`)
- [ ] Driver is verified (`isVerified = true`)
- [ ] Driver has location (`currentLat IS NOT NULL AND currentLng IS NOT NULL`)
- [ ] Driver is within 5km of pickup location
- [ ] Firebase Admin is initialized (`FIREBASE_SERVICE_ACCOUNT` set in Vercel)
- [ ] Notification permissions granted in app
- [ ] App is not in Do Not Disturb mode
- [ ] Phone has internet connection

---

## 🔧 Quick Fixes

### If driver can see requests but no notification:

1. **Check if driver is online:**
   ```sql
   UPDATE drivers SET "isOnline" = true WHERE "userId" = 'driver-user-id';
   ```

2. **Check if driver has push token:**
   ```sql
   SELECT "pushToken" FROM users WHERE id = 'driver-user-id';
   ```

3. **Check Vercel logs** for `[NOTIFICATION]` errors

4. **Test with diagnostic endpoint** to see full status

---

## 📝 Log Format Reference

All notification logs are prefixed with:
- `[NOTIFICATION]` - Notification flow logs
- `[FCM]` - Firebase Cloud Messaging logs
- `[RIDE CREATE]` - Ride creation logs

Look for these in Vercel function logs to trace the entire flow!
