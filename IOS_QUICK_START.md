# iOS Quick Start - For Person with MacBook

## 🚀 Quick Setup (5 Steps)

```bash
# 1. Install dependencies
npm install

# 2. Build Next.js app
npm run build

# 3. Sync Capacitor (creates iOS project)
npx cap sync ios

# 4. Install iOS dependencies
cd ios/App && pod install && cd ../..

# 5. Open in Xcode
npx cap open ios
```

## 📋 Then in Xcode:

1. **Add Firebase Config:**
   - Download `GoogleService-Info.plist` from Firebase Console
   - Drag into Xcode project (check "Copy items if needed")

2. **Add Capabilities:**
   - Signing & Capabilities → + Capability
   - Add "Push Notifications"
   - Add "Background Modes" → Check "Location updates"

3. **Configure Signing:**
   - Select your Apple Developer Team
   - Xcode will auto-create provisioning profile

4. **Build & Run:**
   - Select device/simulator
   - Click Run (▶️)

## 🔥 Firebase Setup for iOS

1. Go to Firebase Console → Project Settings
2. Add iOS app (if not exists):
   - Bundle ID: `com.gosafeappzim.app`
3. Download `GoogleService-Info.plist`
4. Add to Xcode project

## 📱 App Store Submission

1. **Archive**: Product → Archive
2. **Distribute**: Window → Organizer → Distribute App
3. **Upload**: Select "App Store Connect"
4. **Submit**: Go to App Store Connect → Submit for Review

## ✅ That's It!

All native features (location, push notifications, etc.) work automatically on iOS!

See `IOS_SETUP_GUIDE.md` for detailed instructions.
