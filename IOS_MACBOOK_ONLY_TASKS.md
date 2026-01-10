# iOS MacBook Tasks - App Store Update

## ⏱️ Estimated Time: ~50 minutes

## ✅ Step 1: Setup iOS Project (5 minutes)

```bash
npm install
npm run build
npx cap sync ios
cd ios/App && pod install && cd ../..
npx cap open ios
```

---

## ✅ Step 2: Add Assets in Xcode (10 minutes)

### 2.1 Firebase Config
- Right-click **App** folder → **Add Files to "App"**
- Select `ios-assets/firebase/GoogleService-Info.plist`
- ✅ Check **"Copy items if needed"** → **Add**

### 2.2 App Icons
- Find **Assets.xcassets** in Project Navigator
- Right-click **AppIcon** → **Delete** (trash)
- Drag `ios-assets/icons/Assets.xcassets` into Xcode
- ✅ Check **"Copy items if needed"**

### 2.3 Notification Sound
- Right-click **App** folder → **Add Files to "App"**
- Select `ios-assets/sounds/notification_sound.mp3`
- ✅ Check **"Copy items if needed"** → **Add**

### 2.4 Capabilities
- Select **App** target → **Signing & Capabilities**
- Click **+ Capability** → Add **Push Notifications**
- Click **+ Capability** → Add **Background Modes**
- ✅ Check **Location updates** and **Background fetch**

### 2.5 Signing
- Select your **Team** (Apple Developer account)
- ✅ Verify Bundle ID: `com.gosafeappzim.app`

---

## ✅ Step 3: Update Version (1 minute)

- Select **App** target → **General** tab
- **Version**: `5.0.2` (or current)
- **Build**: `52` (or increment)

---

## ✅ Step 4: Test Build (10 minutes)

- Select simulator/device
- Click **Run** (▶️) or `Cmd + R`
- Verify app launches correctly

---

## ✅ Step 5: Archive & Upload (15 minutes)

1. **Product → Archive**
2. Wait for archive (~5-10 min)
3. **Window → Organizer** → **Distribute App**
4. Select **App Store Connect**
5. ✅ Upload symbols
6. ✅ Upload to App Store Connect
7. Wait for processing (~10-30 min)

---

## ✅ Step 6: Submit to App Store (10 minutes)

