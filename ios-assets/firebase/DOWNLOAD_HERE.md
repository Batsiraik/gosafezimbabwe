# Download GoogleService-Info.plist Here

## 📥 Download Instructions

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **gosafe-8da5a**
3. Click **⚙️ Settings** → **Project settings**
4. Scroll to **Your apps** section
5. If iOS app doesn't exist:
   - Click **Add app** → Select **iOS** (🍎)
   - Enter **iOS bundle ID**: `com.gosafeappzim.app`
   - Enter **App nickname**: `GO SAFE iOS`
   - Click **Register app**
6. **Download GoogleService-Info.plist**
7. **Save to this folder**: `ios-assets/firebase/GoogleService-Info.plist`

## ⚠️ Important

This file is required for Firebase Push Notifications to work on iOS.

After downloading, add it to Xcode:
- Right-click **App** folder in Xcode
- **Add Files to "App"**
- Select `GoogleService-Info.plist`
- ✅ Check **"Copy items if needed"**
- Click **Add**
