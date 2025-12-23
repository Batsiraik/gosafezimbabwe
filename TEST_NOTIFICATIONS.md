# Testing Push Notifications

## 🧪 Quick Test Methods

### Method 1: Test API Endpoint (Easiest)

#### Option A: Test with Your User Token (Recommended)

1. **Get your JWT token:**
   - Open the app on your phone
   - Open browser DevTools (if testing on web) or check localStorage
   - Get the token from: `localStorage.getItem('nexryde_token')`

2. **Send test notification:**
   ```bash
   curl -X POST https://gosafezimbabwe.vercel.app/api/test-notification \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json"
   ```

   Or use a tool like Postman/Insomnia:
   - **Method**: POST
   - **URL**: `https://gosafezimbabwe.vercel.app/api/test-notification`
   - **Headers**: 
     - `Authorization: Bearer YOUR_JWT_TOKEN`
   - **Send**

3. **Check your phone** - You should receive a notification! 🔔

#### Option B: Test with FCM Token Directly

1. **Get your FCM token:**
   - Open the app on your phone
   - Check Vercel function logs or browser console for: `"Push registration success, token: ..."`
   - Or check your database: `SELECT pushToken FROM users WHERE id = 'your-user-id'`

2. **Send test notification:**
   ```
   https://gosafezimbabwe.vercel.app/api/test-notification?token=YOUR_FCM_TOKEN
   ```

   Just open this URL in a browser (replace `YOUR_FCM_TOKEN` with your actual token)

---

### Method 2: Firebase Console (Alternative)

1. **Get FCM Token:**
   - Same as Method 1, Option B above

2. **Send from Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select project: `gosafe-8da5a`
   - Go to **Cloud Messaging** → **Send your first message**
   - Enter:
     - **Title**: Test Notification
     - **Text**: Testing push notifications
   - Click **Send test message**
   - Paste your FCM token
   - Click **Test**

---

### Method 3: Real App Flow (Best for End-to-End Testing)

1. **As a Driver:**
   - Make sure you're logged in as a driver
   - Go online in the driver dashboard
   - Have another user (or use browser) create a ride request
   - You should receive: "🚗 New Ride Request"

2. **As a User:**
   - Create a ride request
   - Have a driver bid on it
   - Accept the bid
   - Driver should receive: "✅ Ride Accepted!"

---

## 🔍 Troubleshooting

### No notification received?

1. **Check if token exists:**
   - Database: `SELECT pushToken FROM users WHERE id = 'your-user-id'`
   - Should not be NULL

2. **Check Vercel logs:**
   - Go to Vercel Dashboard → Your deployment → Functions tab
   - Look for errors when sending notifications

3. **Check device:**
   - Make sure notification permissions are granted
   - Check phone's notification settings for the app
   - Make sure phone is not in Do Not Disturb mode

4. **Check Firebase:**
   - Verify `FIREBASE_SERVICE_ACCOUNT` is set in Vercel
   - Check Firebase Console → Cloud Messaging → Reports for delivery status

### "Firebase Admin not initialized" error?

- Make sure `FIREBASE_SERVICE_ACCOUNT` environment variable is set in Vercel
- Check that the JSON is valid (no syntax errors)
- Redeploy Vercel after adding the variable

---

## ✅ Success Indicators

- ✅ Notification appears on your device
- ✅ Custom sound plays (`notification_sound.mp3`)
- ✅ Notification shows correct title and message
- ✅ Tapping notification opens the app

---

**The easiest way is Method 1, Option A - just use your JWT token and call the test endpoint!** 🚀
