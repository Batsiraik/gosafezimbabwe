# Driver Data Structure Explained

## 📊 Database Tables

### 1. `users` Table
Stores **all user information** (both regular users and drivers):
- `id` - User ID
- `fullName` - User's name
- `phone` - User's phone number
- `pushToken` - **FCM push notification token** (stored here!)
- `password` - Encrypted password
- etc.

### 2. `drivers` Table
Stores **driver-specific information**:
- `id` - Driver record ID
- `userId` - **Links to `users.id`** (one-to-one relationship)
- `serviceType` - 'taxi', 'parcel', etc.
- `isVerified` - Admin verified the driver
- `isOnline` - Driver is currently online
- `currentLat` - Driver's current latitude
- `currentLng` - Driver's current longitude
- `licenseNumber`, `carRegistration`, etc.

---

## 🔍 How We Query for Drivers

When finding drivers for notifications, we:

1. **Query `drivers` table** (to get driver status)
2. **Join with `users` table** (to get `pushToken`)

```sql
SELECT 
  d.id,
  d."userId",
  d."serviceType",
  d."isVerified",
  d."isOnline",
  d."currentLat",
  d."currentLng",
  u."fullName",      -- From users table
  u.phone,           -- From users table
  u."pushToken"      -- From users table (THIS IS THE KEY!)
FROM drivers d
JOIN users u ON u.id = d."userId"
WHERE d."serviceType" = 'taxi'
  AND d."isVerified" = true
  AND d."isOnline" = true
  AND u."pushToken" IS NOT NULL;  -- Must have push token!
```

---

## 🚨 Your Current Issue

The logs show:
```
Driver: john doe - Verified: true, Online: true, Has Token: false, Has Location: true
```

This means:
- ✅ Driver exists in `drivers` table
- ✅ Driver is verified (`isVerified = true`)
- ✅ Driver is online (`isOnline = true`)
- ✅ Driver has location (`currentLat` and `currentLng` are set)
- ❌ **Driver's user account has NO pushToken** (`users.pushToken IS NULL`)

---

## 🔍 Diagnostic Query

Run this to see the exact data:

```sql
SELECT 
  u.id as user_id,
  u."fullName",
  u.phone,
  u."pushToken",
  CASE 
    WHEN u."pushToken" IS NULL THEN '❌ NO TOKEN'
    WHEN LENGTH(u."pushToken") < 50 THEN '❌ TOKEN TOO SHORT'
    ELSE '✅ HAS TOKEN'
  END as token_status,
  d.id as driver_id,
  d."serviceType",
  d."isVerified",
  d."isOnline",
  d."currentLat",
  d."currentLng",
  CASE 
    WHEN d."currentLat" IS NULL OR d."currentLng" IS NULL THEN '❌ NO LOCATION'
    ELSE '✅ HAS LOCATION'
  END as location_status
FROM users u
LEFT JOIN drivers d ON d."userId" = u.id
WHERE u.phone = 'DRIVER_PHONE_NUMBER';
```

---

## ✅ What Needs to Happen

For the driver to receive notifications:

1. **Driver opens app** → Goes to driver dashboard
2. **Push notifications initialize** → Requests permission
3. **FCM token generated** → Token received from Capacitor
4. **Token stored in `users.pushToken`** → Via `/api/users/push-token` endpoint
5. **Token persists** → Even when app is closed
6. **Notifications work** → FCM sends to device even when app is closed

---

## 🎯 Current Status

Based on logs:
- Driver "john doe" exists
- Driver is verified and online
- Driver has location
- **BUT `users.pushToken` is NULL**

**Solution**: Driver needs to open the driver dashboard ONCE to get the token stored.

---

## 📝 Quick Check

Run this to see if token exists:

```sql
SELECT 
  u."fullName",
  u.phone,
  u."pushToken",
  d."isOnline",
  d."isVerified"
FROM users u
LEFT JOIN drivers d ON d."userId" = u.id
WHERE d."serviceType" = 'taxi'
  AND d."isOnline" = true;
```

This shows all online taxi drivers and whether they have push tokens.
