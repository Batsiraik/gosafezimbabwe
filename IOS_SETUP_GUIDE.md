# iOS App Store Setup Guide - GO SAFE App

## ✅ Good News: Most Features Will Work Automatically!

All the native features you've implemented will work on iOS:
- ✅ **Geolocation** - Works automatically (uses native iOS location services)
- ✅ **Background Location** - Works automatically (with proper permissions)
- ✅ **Push Notifications** - Works automatically (uses APNS instead of FCM)
- ✅ **Deep Linking** - Works automatically
- ✅ **App Lifecycle** - Works automatically
- ✅ **All your React/Next.js code** - Works automatically

## 📋 What Needs to Be Done (Before Sending Code)

### 1. ✅ Code is Already Ready
- All Capacitor plugins are installed
- iOS platform package is installed (`@capacitor/ios`)
- Configuration is set up in `capacitor.config.ts`
- **You can send the code as-is!**

### 2. ⚠️ iOS-Specific Files Needed (Will be created on MacBook)

These will be automatically created when the person runs `npx cap sync ios`:
- `ios/` folder (native iOS project)
- Xcode project files
- Podfile (for CocoaPods dependencies)

## 🍎 Step-by-Step Process for MacBook

### ⚠️ IMPORTANT: Pre-preparation on Windows

**Before renting a MacBook, complete all steps in `IOS_PREPARE_ON_WINDOWS.md`!**

This will save you 2-3 hours of MacBook rental time. Everything is already prepared:
- ✅ Firebase iOS app configured
- ✅ GoogleService-Info.plist downloaded
- ✅ App icons generated
- ✅ Splash screens prepared
- ✅ Notification sound ready
- ✅ All assets in `ios-assets/` folder

---

### Prerequisites (MacBook needs):
1. **macOS** (required for iOS development)
2. **Xcode** (free from Mac App Store - ~12GB download)
3. **Apple Developer Account** ($99/year) - Required for App Store
4. **CocoaPods** (will install automatically or via `sudo gem install cocoapods`)

---

### Step 1: Initial Setup (First Time Only)

```bash
# 1. Clone/pull your code repository
cd /path/to/gosafezimbabwe

# 2. Install dependencies
npm install

# 3. Build Next.js app (required before syncing)
npm run build

# 4. Sync Capacitor (creates iOS project if it doesn't exist)
npx cap sync ios

# 5. Open iOS project in Xcode
npx cap open ios
```

---

### Step 2: Install iOS Dependencies

```bash
# Navigate to iOS folder
cd ios/App

# Install CocoaPods dependencies
pod install

# Go back to root
cd ../..
```

**Note**: If `pod install` fails, try:
```bash
sudo gem install cocoapods
pod repo update
pod install
```

---

### Step 3: Configure Firebase for iOS

#### 3.1 Get GoogleService-Info.plist from Firebase

**✅ Already done on Windows!** The file is in `ios-assets/firebase/GoogleService-Info.plist`

If you skipped the Windows preparation:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `gosafe-8da5a`
3. Click **⚙️ Settings** → **Project settings**
4. Go to **Your apps** section
5. If iOS app doesn't exist, click **Add app** → **iOS**
6. Enter:
   - **iOS bundle ID**: `com.gosafeappzw.app` (must match `capacitor.config.ts`)
   - **App nickname**: GO SAFE iOS (optional)
   - **App Store ID**: (leave blank for now)
7. Click **Register app**
8. Download `GoogleService-Info.plist`
9. **Place it in**: `ios-assets/firebase/GoogleService-Info.plist`

#### 3.2 Add to Xcode Project

1. Open Xcode: `npx cap open ios`
2. In Xcode, right-click on `App` folder in Project Navigator
3. Select **Add Files to "App"**
4. Select `ios-assets/firebase/GoogleService-Info.plist` (or navigate to it)
5. Make sure **"Copy items if needed"** is checked
6. Click **Add**

---

### Step 4: Configure Push Notifications (APNS)

#### 4.1 Enable Push Notifications in Xcode

1. In Xcode, select the **App** project (blue icon) in Project Navigator
2. Select **App** target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Add **Push Notifications**
6. Add **Background Modes** → Check **Location updates** and **Background fetch**

#### 4.2 Configure APNS in Firebase

1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Under **Apple app configuration**, upload your APNS certificate:
   - Option A: **APNs Authentication Key** (recommended)
     - Go to Apple Developer → Certificates, Identifiers & Profiles
     - Create an APNs Auth Key
     - Download the `.p8` file
     - Upload to Firebase
   - Option B: **APNs Certificates**
     - Create APNs certificate in Apple Developer
     - Upload to Firebase

#### 4.3 Update Notification Sound for iOS

**✅ Already done on Windows!** The sound file is in `ios-assets/sounds/`

1. In Xcode, right-click on `App` folder in Project Navigator
2. Select **Add Files to "App"**
3. Select `ios-assets/sounds/notification_sound.mp3` (or `.caf` if you converted it)
4. Make sure **"Copy items if needed"** is checked
5. Click **Add**

**Note**: The code already handles both Android (FCM) and iOS (APNS) automatically!

---

### Step 5: Configure App Icons and Splash Screen

#### 5.1 App Icons

**✅ Already done on Windows!** All icons are in `ios-assets/icons/`

1. In Xcode: **Assets.xcassets** → **AppIcon**
2. Drag and drop all icon files from `ios-assets/icons/` to appropriate slots:
   - 20pt → 2x, 3x
   - 29pt → 2x, 3x
   - 40pt → 2x, 3x
   - 60pt → 2x, 3x
   - App Store → 1024x1024

#### 5.2 Splash Screen

**✅ Already done on Windows!** Splash images are in `ios-assets/splash/`

**Option A: Use LaunchScreen.storyboard (Recommended)**
- Default Capacitor setup uses this - no action needed!
- Or customize in Xcode: **LaunchScreen.storyboard**

**Option B: Use LaunchImage (Legacy)**
1. In Xcode: **Assets.xcassets** → **LaunchImage**
2. Drag splash images from `ios-assets/splash/` to appropriate slots

---

### Step 6: Configure App Signing

1. In Xcode, select **App** target
2. Go to **Signing & Capabilities**
3. Select your **Team** (Apple Developer account)
4. Xcode will automatically create provisioning profiles

**Important**: You need an Apple Developer account ($99/year) to sign the app.

---

### Step 7: Update App Version

1. In Xcode, select **App** target
2. Go to **General** tab
3. Update:
   - **Version**: `5.0.2` (or your current version)
   - **Build**: `52` (or increment from Android)

---

### Step 8: Test on Simulator/Device

#### Test on Simulator:
1. In Xcode, select a simulator (e.g., iPhone 15 Pro)
2. Click **Run** button (▶️) or press `Cmd + R`
3. App will build and launch in simulator

#### Test on Real Device:
1. Connect iPhone via USB
2. Trust computer on iPhone
3. In Xcode, select your device
4. Click **Run**
5. On iPhone: **Settings → General → VPN & Device Management** → Trust your developer certificate

---

### Step 9: Build for App Store

1. In Xcode: **Product → Archive**
2. Wait for archive to complete
3. **Window → Organizer** (or **Product → Distribute App**)
4. Select **App Store Connect**
5. Follow the wizard:
   - Upload symbols (for crash reports)
   - Upload to App Store Connect
6. Wait for processing (~10-30 minutes)

---

### Step 10: Submit to App Store

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Create new app (if not exists):
   - **Name**: GO SAFE
   - **Primary Language**: English
   - **Bundle ID**: `com.gosafeappzw.app`
   - **SKU**: `gosafe-ios-001` (unique identifier)
3. Fill in app information:
   - Description
   - Screenshots (required for App Store)
   - Privacy policy URL
   - Support URL
4. Submit for review

---

## 🔧 iOS-Specific Code Adjustments (Already Handled!)

Your code already handles iOS automatically:

### Push Notifications
- ✅ Code detects platform: `Capacitor.getPlatform() === 'ios'`
- ✅ Uses APNS tokens automatically (no code changes needed)
- ✅ Firebase Admin SDK handles both FCM and APNS

### Geolocation
- ✅ `@capacitor/geolocation` works on both platforms
- ✅ Background location works on iOS (with proper permissions)

### Permissions
- ✅ iOS will automatically request permissions when needed
- ✅ Location permissions: "While Using App" and "Always" options

---

## 📝 Checklist Before Sending Code

### ✅ Code is Ready:
- [x] All Capacitor plugins installed
- [x] iOS platform package installed
- [x] Configuration set up
- [x] Push notification code supports iOS
- [x] Background location code supports iOS
- [x] All features are platform-agnostic

### ⚠️ Person with MacBook Needs to Do:
- [ ] Install Xcode
- [ ] Install CocoaPods
- [ ] Get Apple Developer account ($99/year)
- [ ] Download `GoogleService-Info.plist` from Firebase
- [ ] Configure APNS in Firebase
- [ ] Add app icons
- [ ] Configure app signing
- [ ] Build and test
- [ ] Submit to App Store

---

## 🚨 Important Notes

### 1. Firebase Setup
- **Android**: Uses `google-services.json` ✅ (already done)
- **iOS**: Needs `GoogleService-Info.plist` ⚠️ (person with MacBook needs to add)

### 2. Push Notifications
- **Android**: Uses FCM tokens ✅ (already working)
- **iOS**: Uses APNS tokens ✅ (code already supports, just needs Firebase APNS config)

### 3. App Store Requirements
- **Privacy Policy URL** (required)
- **Support URL** (required)
- **Screenshots** (required - at least iPhone 6.7" and 6.5" displays)
- **App Description** (required)
- **Age Rating** (required)

### 4. Testing
- Can test on iOS Simulator (free)
- Can test on real device (needs Apple Developer account)
- App Store submission requires paid Apple Developer account

---

## 📦 What to Send to Person with MacBook

### Option 1: Git Repository (Recommended)
```bash
# They can clone your repo
git clone <your-repo-url>
cd gosafezimbabwe
npm install
npm run build
npx cap sync ios
```

### Option 2: Zip File
- Zip the entire project folder
- Send via cloud storage (Google Drive, Dropbox, etc.)
- They extract and run the same commands

### Files to Include:
- ✅ All source code (`src/` folder)
- ✅ `package.json` (has all dependencies)
- ✅ `capacitor.config.ts` (configuration)
- ✅ `next.config.js`
- ✅ `prisma/` folder (database schema)
- ✅ `.env.example` (if you have one, for reference)
- ✅ This guide (`IOS_SETUP_GUIDE.md`)

### Files NOT Needed (will be generated):
- `node_modules/` (they'll run `npm install`)
- `ios/` folder (will be created by `npx cap sync ios`)
- `.next/` build folder (they'll run `npm run build`)

---

## 🎯 Quick Start Commands for Person with MacBook

```bash
# 1. Install dependencies
npm install

# 2. Build Next.js app
npm run build

# 3. Sync Capacitor (creates iOS project)
npx cap sync ios

# 4. Install iOS dependencies
cd ios/App
pod install
cd ../..

# 5. Open in Xcode
npx cap open ios

# 6. In Xcode:
#    - Add GoogleService-Info.plist
#    - Configure signing
#    - Add capabilities (Push Notifications, Background Modes)
#    - Build and run
```

---

## 🔍 Verification Checklist

After setup, verify:
- [ ] App builds successfully in Xcode
- [ ] App runs on iOS Simulator
- [ ] App runs on real iPhone
- [ ] Push notifications work (test with Firebase Console)
- [ ] Location tracking works
- [ ] Background location works (test by minimizing app)
- [ ] All features work as expected

---

## 📞 Support

If the person with MacBook encounters issues:
1. Check Xcode console for errors
2. Check Firebase Console for notification delivery
3. Verify all certificates and provisioning profiles
4. Ensure Apple Developer account is active

---

## ✅ Summary

**You can send the code right now!** 

The person with MacBook just needs to:
1. Run `npm install && npm run build && npx cap sync ios`
2. Add Firebase `GoogleService-Info.plist`
3. Configure APNS in Firebase
4. Build and submit to App Store

All your native features will work on iOS automatically! 🎉
