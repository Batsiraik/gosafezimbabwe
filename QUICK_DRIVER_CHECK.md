# Quick Driver Status Check

## 🔍 Check Why Driver Isn't Receiving Notifications

### Step 1: Get Driver's User ID

Run this SQL query to get the driver's user ID:

```sql
SELECT u.id, u."fullName", u.phone, d."isOnline", d."isVerified", d."currentLat", d."currentLng", u."pushToken"
FROM users u
JOIN drivers d ON d."userId" = u.id
WHERE u.phone = 'DRIVER_PHONE_NUMBER';
```

### Step 2: Check Driver Status via API

Call this endpoint with the driver's JWT token:

```
GET https://gosafezimbabwe.vercel.app/api/notifications/check-driver?userId=DRIVER_USER_ID
Headers: Authorization: Bearer DRIVER_JWT_TOKEN
```

This will show:
- ✅ Is driver verified?
- ✅ Is driver online?
- ✅ Does driver have push token?
- ✅ Does driver have location?
- ✅ Would driver be found by notification query?

---

## 🚨 Common Issues

### Issue 1: Driver has no push token

**Check:**
```sql
SELECT "pushToken" FROM users WHERE id = 'driver-user-id';
```

**Fix:**
- Driver needs to open app and allow notifications
- Token is stored automatically when app initializes

### Issue 2: Driver is offline

**Check:**
```sql
SELECT "isOnline" FROM drivers WHERE "userId" = 'driver-user-id';
```

**Fix:**
- Driver needs to toggle "Online" in driver dashboard

### Issue 3: Driver has no location

**Check:**
```sql
SELECT "currentLat", "currentLng" FROM drivers WHERE "userId" = 'driver-user-id';
```

**Fix:**
- Driver needs to have location permissions enabled
- Driver needs to be online (location updates when online)

### Issue 4: Driver not verified

**Check:**
```sql
SELECT "isVerified" FROM drivers WHERE "userId" = 'driver-user-id';
```

**Fix:**
- Admin needs to verify the driver in admin panel

---

## 📊 What the Logs Should Show

When you create a ride request, you should see:

```
[NOTIFICATION] Finding taxi drivers within 5km...
[NOTIFICATION] Total taxi drivers in system: X
[NOTIFICATION] Driver: John - Verified: true, Online: true, Has Token: true, Has Location: true
[NOTIFICATION] Found X online taxi drivers with push tokens
[NOTIFICATION] Driver John is X.XX km away
[NOTIFICATION] ✅ Driver John is within range
[NOTIFICATION] Total drivers in range: X
[NOTIFICATION] Sending to user John...
[FCM] Attempting to send notification...
[FCM] ✅ Successfully sent
```

If you don't see these logs, check:
1. Is driver online? (`isOnline = true`)
2. Does driver have push token? (`pushToken IS NOT NULL`)
3. Does driver have location? (`currentLat IS NOT NULL AND currentLng IS NOT NULL`)

---

**After deploying, create a ride request and check the Vercel logs - you'll see exactly why the driver isn't being notified!**
