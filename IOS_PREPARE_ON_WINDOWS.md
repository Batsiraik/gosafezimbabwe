# iOS Preparation on Windows - Complete Guide

This guide will help you prepare **everything possible** on Windows before renting a MacBook, so you only need to do the final build and upload on Mac.

## ✅ What We Can Do on Windows (Right Now!)

1. ✅ **Download Firebase iOS Config** - Get `GoogleService-Info.plist`
2. ✅ **Prepare App Icons** - Generate all iOS icon sizes
3. ✅ **Prepare Splash Screen** - Generate splash screen images
4. ✅ **Prepare Notification Sound** - Copy/convert sound file
5. ✅ **Configure Firebase for iOS** - Add iOS app in Firebase Console
6. ✅ **Build Next.js App** - Run `npm run build`
7. ✅ **Organize All Assets** - Put everything in `ios-assets/` folder

## ❌ What Requires MacBook (Only 2-3 Things!)

1. ❌ **Run `npx cap sync ios`** - Creates iOS project (requires Xcode)
2. ❌ **Run `pod install`** - Installs CocoaPods (requires macOS)
3. ❌ **Build IPA & Upload** - Archive and submit to App Store (requires Xcode)

---

## 🚀 Step-by-Step: Prepare Everything on Windows

### Step 1: Create Assets Folder Structure ✅

Already done! The `ios-assets/` folder is created with subfolders:
- `ios-assets/icons/` - For app icons
- `ios-assets/splash/` - For splash screens
- `ios-assets/firebase/` - For GoogleService-Info.plist
- `ios-assets/sounds/` - For notification sound

---

### Step 2: Configure Firebase for iOS (15 minutes)

#### 2.1 Add iOS App to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **gosafe-8da5a**
3. Click **⚙️ Settings** → **Project settings**
4. Scroll to **Your apps** section
5. Click **Add app** → Select **iOS** (🍎 icon)
6. Fill in the form:
   - **iOS bundle ID**: `com.gosafeappzw.app` (must match `capacitor.config.ts`)
   - **App nickname**: `GO SAFE iOS` (optional)
   - **App Store ID**: (leave blank for now - you'll add it later)
7. Click **Register app**

#### 2.2 Download GoogleService-Info.plist

1. After registering, Firebase will show a download button
2. Click **Download GoogleService-Info.plist**
3. **Save it to**: `ios-assets/firebase/GoogleService-Info.plist`
4. ✅ **Done!** This file will be added to Xcode project on MacBook

**Important**: Don't skip this! You need this file for push notifications to work.

---

### Step 3: Prepare App Icons (30 minutes)

iOS requires app icons in specific sizes. We'll generate them from your existing Android icon.

#### 3.1 Find Your Source Icon

Your Android icons are in:
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (highest quality)

Or if you have a source icon (1024x1024px PNG), use that.

#### 3.2 Generate iOS Icons

**Option A: Online Tool (Easiest) - RECOMMENDED** ⭐
1. Go to [App Icon Generator](https://www.appicon.co/) or [IconKitchen](https://icon.kitchen/)
2. Upload your source icon (1024x1024px PNG recommended)
3. Select **iOS** platform
4. Download the generated icon set
5. **Extract the zip file**
6. **Copy the entire `Assets.xcassets` folder** to `ios-assets/icons/`
   - The structure should be: `ios-assets/icons/Assets.xcassets/AppIcon.appiconset/`
7. **Move all PNG files** from any subfolders (like `_`) to `AppIcon.appiconset/` directly
8. ✅ **Done!** Icons are in Xcode-ready format

**Option B: Manual Individual Files (Alternative)**
If you prefer individual files instead of Assets.xcassets structure:
- `icon-20@2x.png` - 40x40px
- `icon-20@3x.png` - 60x60px
- `icon-29@2x.png` - 58x58px
- `icon-29@3x.png` - 87x87px
- `icon-40@2x.png` - 80x80px
- `icon-40@3x.png` - 120x120px
- `icon-60@2x.png` - 120x120px
- `icon-60@3x.png` - 180x180px
- `icon-1024.png` - 1024x1024px (App Store)

✅ **Done!** All icons ready in `ios-assets/icons/`

---

### Step 4: Prepare Splash Screen (20 minutes)

#### 4.1 Find Your Splash Screen Source

Your Android splash screens are in:
- `android/app/src/main/res/drawable/splash.png`

Or create a new one (recommended: 2048x2048px with your logo centered).

#### 4.2 Generate iOS Splash Screens

**Option A: Online Tool**
1. Go to [Splash Screen Generator](https://www.appicon.co/#splash) or similar
2. Upload your splash image
3. Select **iOS** platform
4. Download generated splash screens
5. Place in `ios-assets/splash/`

**Option B: Manual Sizes**
iOS uses LaunchScreen.storyboard (preferred) or LaunchImage. For LaunchImage, create:
- `Default@2x.png` - 750x1334px (iPhone 6/7/8)
- `Default@3x.png` - 1242x2208px (iPhone 6+/7+/8+)
- `Default-568h@2x.png` - 640x1136px (iPhone 5/SE)
- `Default-812h@3x.png` - 1125x2436px (iPhone X/XS)
- `Default-896h@2x.png` - 828x1792px (iPhone XR)
- `Default-896h@3x.png` - 1242x2688px (iPhone XS Max)

**Note**: Modern iOS apps use LaunchScreen.storyboard (single file), but LaunchImage works too.

✅ **Done!** Splash screens ready in `ios-assets/splash/`

---

### Step 5: Prepare Notification Sound (5 minutes)

#### 5.1 Copy Sound File

Your Android notification sound is:
- `android/app/src/main/res/raw/notification_sound.ogg`

#### 5.2 Convert for iOS

iOS prefers `.caf` format, but `.mp3` also works.

**Option A: Use MP3 (Easiest)**
1. If you have the original MP3, copy it to `ios-assets/sounds/notification_sound.mp3`
2. ✅ Done! iOS can use MP3

**Option B: Convert to CAF (Recommended for iOS)**
1. Use online converter: [Convert MP3 to CAF](https://cloudconvert.com/mp3-to-caf)
2. Or use FFmpeg (if installed):
   ```bash
   ffmpeg -i notification_sound.mp3 -f caf notification_sound.caf
   ```
3. Save to `ios-assets/sounds/notification_sound.caf`

✅ **Done!** Sound file ready in `ios-assets/sounds/`

---

### Step 6: Build Next.js App (5 minutes)

This ensures everything is ready before syncing on MacBook:

```bash
# Install dependencies (if not done)
npm install

# Build Next.js app
npm run build
```

✅ **Done!** App is built and ready.

---

### Step 7: Verify Everything is Ready ✅

Check that you have:

```
ios-assets/
├── icons/
│   ├── icon-20@2x.png
│   ├── icon-20@3x.png
│   ├── icon-29@2x.png
│   ├── icon-29@3x.png
│   ├── icon-40@2x.png
│   ├── icon-40@3x.png
│   ├── icon-60@2x.png
│   ├── icon-60@3x.png
│   └── icon-1024.png
├── splash/
│   └── (splash screen images)
├── firebase/
│   └── GoogleService-Info.plist ✅
└── sounds/
    └── notification_sound.mp3 (or .caf) ✅
```

---

## 🍎 What to Do on MacBook (Only 3 Steps!)

### Step 1: Sync iOS Project (5 minutes)

```bash
# On MacBook, after cloning/pulling code:
npm install
npm run build
npx cap sync ios
cd ios/App
pod install
cd ../..
npx cap open ios
```

### Step 2: Add Assets in Xcode (10 minutes)

1. **Add GoogleService-Info.plist:**
   - Drag `ios-assets/firebase/GoogleService-Info.plist` into Xcode project
   - Check "Copy items if needed"

2. **Add App Icons:**
   - In Xcode: **Assets.xcassets** → **AppIcon**
   - Drag all icons from `ios-assets/icons/` to appropriate slots

3. **Add Splash Screen:**
   - Use LaunchScreen.storyboard (default) or add LaunchImage
   - Add splash images from `ios-assets/splash/`

4. **Add Notification Sound:**
   - Drag sound file from `ios-assets/sounds/` to Xcode project
   - Check "Copy items if needed"

5. **Add Capabilities:**
   - Signing & Capabilities → + Capability
   - Add "Push Notifications"
   - Add "Background Modes" → Check "Location updates"

6. **Configure Signing:**
   - Select your Apple Developer Team
   - Xcode auto-creates provisioning profile

### Step 3: Build & Upload (30 minutes)

1. **Test Build:**
   - Select simulator or device
   - Click Run (▶️)

2. **Archive:**
   - Product → Archive
   - Wait for completion

3. **Distribute:**
   - Window → Organizer → Distribute App
   - Select "App Store Connect"
   - Upload

4. **Submit:**
   - Go to App Store Connect
   - Fill in app info
   - Submit for review

---

## ✅ Summary

### ✅ Done on Windows (You):
- [x] Firebase iOS app configured
- [x] GoogleService-Info.plist downloaded
- [x] App icons generated (all sizes)
- [x] Splash screens prepared
- [x] Notification sound ready
- [x] Next.js app built
- [x] All assets organized in `ios-assets/`

### ⏱️ Time Saved: ~2-3 hours!

### ❌ Only on MacBook (Rental):
- [ ] Run `npx cap sync ios` (5 min)
- [ ] Run `pod install` (5 min)
- [ ] Add assets in Xcode (10 min)
- [ ] Build & upload (30 min)

**Total MacBook time: ~50 minutes!** 🎉

---

## 📝 Checklist Before Pushing to Git

- [ ] `ios-assets/` folder created
- [ ] `GoogleService-Info.plist` downloaded and in `ios-assets/firebase/`
- [ ] App icons generated and in `ios-assets/icons/`
- [ ] Splash screens prepared and in `ios-assets/splash/`
- [ ] Notification sound in `ios-assets/sounds/`
- [ ] Next.js app built (`npm run build`)
- [ ] All files committed to Git
- [ ] Documentation updated

---

## 🚀 Next Steps

1. **Complete all Windows steps above** ✅
2. **Commit everything to Git** ✅
3. **Rent MacBook** (only need ~1 hour!)
4. **Follow MacBook steps** (3 simple steps)
5. **Submit to App Store** 🎉

---

## 📞 Need Help?

- Firebase setup: See `FIREBASE_SETUP.md`
- Icon generation: Use [App Icon Generator](https://www.appicon.co/)
- Splash screen: Use [Splash Screen Generator](https://www.appicon.co/#splash)
- Sound conversion: Use [CloudConvert](https://cloudconvert.com/)

---

**You're almost ready! Just complete the Windows steps above, and you'll save hours on MacBook rental!** 💰⏰
