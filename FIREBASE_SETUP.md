# Firebase Cloud Messaging (FCM) Setup Guide

## ✅ What's Been Done

1. ✅ Installed Firebase Admin SDK
2. ✅ Added `google-services.json` to Android project
3. ✅ Updated package name to match Firebase: `com.gosafeappzw.app`
4. ✅ Created notification sending functions for all events
5. ✅ Integrated notifications into API routes
6. ✅ Added push token storage in database

---

## 🔥 Firebase Service Account Setup

To send push notifications from your backend, you need a Firebase Service Account key:

### Step 1: Get Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `gosafe-8da5a`
3. Click the **⚙️ Settings** icon → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file (e.g., `gosafe-firebase-adminsdk.json`)

### Step 2: Add to Environment Variables

**For Vercel:**
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add a new variable:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Copy the entire contents of the JSON file you downloaded
   - **Environment**: Production, Preview, Development (all)

**For Local Development (.env.local):**
```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"gosafe-8da5a",...}'
```

**Important**: The value must be a valid JSON string. If your JSON has newlines, you can:
- Use a single line (remove all newlines)
- Or use a JSON minifier tool

### Step 3: Initialize Firebase Admin

Firebase Admin will automatically initialize when you make your first API call that uses it. The initialization happens in `src/lib/firebase-admin.ts`.

---

## 📱 Notification Events Configured

### ✅ Ride Service
- **New ride request** → Notifies drivers within 5km
- **Ride bid accepted** → Notifies the driver

### ✅ Parcel Service
- **New parcel request** → Notifies parcel drivers within 5km
- **Parcel bid accepted** → Notifies the driver

### ✅ Home Services
- **New service request** → Notifies all verified providers offering that service

### ✅ City-to-City Ride Share
- **Match found** → Notifies passenger when driver accepts them

---

## 🧪 Testing Notifications

### 1. Test on Device
1. Install the APK on your Android device
2. Open the app and allow notification permissions
3. Create a test ride/parcel/service request
4. Check if nearby drivers/providers receive notifications

### 2. Check Logs
- Check Vercel function logs for notification sending errors
- Check device logs: `adb logcat | grep FCM`

### 3. Firebase Console
- Go to Firebase Console → Cloud Messaging
- You can send test notifications from there

---

## 🔧 Troubleshooting

### "Firebase Admin not initialized"
- Make sure `FIREBASE_SERVICE_ACCOUNT` environment variable is set
- Check that the JSON is valid (no syntax errors)
- Restart your Vercel deployment after adding the env variable

### "Invalid registration token"
- User's push token might be expired
- Token should be automatically refreshed by the app
- Old tokens will be logged and can be removed from database

### Notifications not received
1. Check device notification permissions
2. Check Firebase Console for delivery status
3. Verify `google-services.json` is in `android/app/`
4. Rebuild APK after adding `google-services.json`

---

## 📝 Next Steps

1. **Add Firebase Service Account** to Vercel environment variables
2. **Test notifications** on a real device
3. **Monitor notification delivery** in Firebase Console
4. **Add notification handling** in the app (when user taps notification, navigate to relevant page)

---

## 🎯 Future Enhancements

- [ ] Add notification badge counts
- [ ] Add notification actions (buttons in notification)
- [ ] Add notification history in app
- [ ] Add admin panel to send notifications to all users
- [ ] Add notification preferences (users can opt-out of certain types)
