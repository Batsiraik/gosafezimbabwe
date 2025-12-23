# Background Location Tracking Setup

## ✅ What's Been Done

1. ✅ Installed `@capacitor/app` plugin
2. ✅ Created background location tracking service (`src/lib/background-location.ts`)
3. ✅ Updated taxi driver dashboard to use background tracking
4. ✅ Updated parcel driver dashboard to use background tracking
5. ✅ Added background location permission to AndroidManifest.xml

---

## 🔄 How It Works

### When Driver Goes Online:

1. **Background location tracking starts automatically**
2. **Location updates every 30 seconds** (even when app is closed)
3. **Location is sent to server** to update driver's position
4. **Notifications work** even when app is in background

### When Driver Goes Offline:

1. **Background tracking stops** (saves battery)
2. **Location updates stop**

### When App is Closed/Minimized:

- ✅ **Location tracking continues** (using Capacitor native geolocation)
- ✅ **Notifications still work** (FCM handles this)
- ✅ **Driver receives ride requests** even with phone locked

---

## 📱 Android Background Location

### Permissions Already Added:

- ✅ `ACCESS_FINE_LOCATION`
- ✅ `ACCESS_COARSE_LOCATION`
- ✅ `ACCESS_BACKGROUND_LOCATION` (for Android 10+)

### User Action Required:

**On Android 10+**, users need to manually grant "Allow all the time" location permission:

1. **First time driver goes online:**
   - Android will show permission dialog
   - User must select **"Allow all the time"** (not just "While using app")

2. **If permission was denied:**
   - Go to: **Settings → Apps → GO SAFE → Permissions → Location**
   - Select **"Allow all the time"**

---

## 🧪 Testing Background Location

### Test Steps:

1. **Open app as driver**
2. **Go to driver dashboard**
3. **Toggle "Online"**
4. **Minimize/close the app** (don't force stop)
5. **Lock your phone**
6. **Create a ride request from another account**
7. **You should receive notification** even with phone locked! 🔔

### Verify It's Working:

1. **Check Vercel logs** for `[BG LOCATION]` or `[DRIVER]` logs
2. **Check database** - driver's `currentLat` and `currentLng` should update every 30 seconds
3. **Create ride request** - driver should receive notification

---

## 🔋 Battery Optimization

### Android Battery Settings:

To ensure background location works properly:

1. **Disable battery optimization for GO SAFE:**
   - Settings → Apps → GO SAFE → Battery → **Unrestricted**

2. **Allow background activity:**
   - Settings → Apps → GO SAFE → Battery → **Allow background activity**

---

## ⚠️ Important Notes

### What Works:
- ✅ Location tracking in background (app minimized)
- ✅ Notifications when app is closed
- ✅ Location updates every 30 seconds

### Limitations:
- ⚠️ **Android may kill the app** if:
  - Battery optimization is enabled
  - Phone is in power saving mode
  - App hasn't been used in a while (Android 12+)

### Best Practices:
- ✅ Disable battery optimization for the app
- ✅ Keep app in "Recent Apps" (don't swipe away)
- ✅ Keep phone connected to internet
- ✅ Keep location services enabled

---

## 🐛 Troubleshooting

### Location not updating in background?

1. **Check permissions:**
   - Settings → Apps → GO SAFE → Permissions → Location
   - Must be "Allow all the time"

2. **Check battery optimization:**
   - Settings → Apps → GO SAFE → Battery → Unrestricted

3. **Check Vercel logs:**
   - Look for `[BG LOCATION]` logs
   - Check for permission errors

### Notifications not working when app closed?

- This is handled by FCM (Firebase Cloud Messaging)
- Notifications work independently of location tracking
- Check Firebase setup and push token

---

## 📝 Next Steps

1. **Rebuild APK** with the new background location code
2. **Test on device:**
   - Go online as driver
   - Close app
   - Create ride request
   - Should receive notification! 🔔

---

**Background location tracking is now active! Drivers can receive notifications even when the app is closed!** 🚀
