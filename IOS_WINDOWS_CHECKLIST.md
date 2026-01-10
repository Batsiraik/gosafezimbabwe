# iOS Windows Preparation Checklist ✅

Complete this checklist **before** renting a MacBook to save time and money!

## 📋 Quick Checklist

- [ ] **Step 1**: Firebase iOS app configured
- [ ] **Step 2**: GoogleService-Info.plist downloaded
- [ ] **Step 3**: App icons generated (all sizes)
- [ ] **Step 4**: Splash screens prepared
- [ ] **Step 5**: Notification sound ready
- [ ] **Step 6**: Next.js app built
- [ ] **Step 7**: All files committed to Git

---

## ✅ Step 1: Configure Firebase for iOS (15 min)

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

### Instructions:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project: **gosafe-8da5a**
3. Settings → Project settings → Your apps
4. Add app → iOS
5. Bundle ID: `com.gosafeappzim.app`
6. Download `GoogleService-Info.plist`
7. Save to: `ios-assets/firebase/GoogleService-Info.plist`

**✅ Done when**: File exists at `ios-assets/firebase/GoogleService-Info.plist`

---

## ✅ Step 2: Generate App Icons (30 min)

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

### Instructions:
1. Go to [App Icon Generator](https://www.appicon.co/)
2. Upload `ios-assets/icons/source-icon.png` (or your 1024x1024px icon)
3. Select **iOS** platform
4. Download generated icons
5. Extract all files to `ios-assets/icons/`

**Required files**:
- `icon-20@2x.png` (40x40px)
- `icon-20@3x.png` (60x60px)
- `icon-29@2x.png` (58x58px)
- `icon-29@3x.png` (87x87px)
- `icon-40@2x.png` (80x80px)
- `icon-40@3x.png` (120x120px)
- `icon-60@2x.png` (120x120px)
- `icon-60@3x.png` (180x180px)
- `icon-1024.png` (1024x1024px)

**✅ Done when**: All 9 icon files are in `ios-assets/icons/`

---

## ✅ Step 3: Prepare Splash Screens (20 min)

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

### Instructions:
1. Go to [Splash Screen Generator](https://www.appicon.co/#splash)
2. Upload `ios-assets/splash/source-splash.png` (or your splash image)
3. Select **iOS** platform
4. Download generated splash screens
5. Extract to `ios-assets/splash/`

**Note**: Modern iOS uses LaunchScreen.storyboard (single file), but having images ready is good.

**✅ Done when**: Splash images are in `ios-assets/splash/`

---

## ✅ Step 4: Prepare Notification Sound (5 min)

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

### Instructions:
**Option A: Use MP3 (Easiest)**
1. If you have original MP3, copy to `ios-assets/sounds/notification_sound.mp3`

**Option B: Convert OGG to MP3**
1. Use [CloudConvert](https://cloudconvert.com/ogg-to-mp3)
2. Upload `ios-assets/sounds/notification_sound.ogg`
3. Convert to MP3
4. Download and save as `ios-assets/sounds/notification_sound.mp3`

**✅ Done when**: `notification_sound.mp3` (or `.caf`) exists in `ios-assets/sounds/`

---

## ✅ Step 5: Build Next.js App (5 min)

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

### Instructions:
```bash
npm install
npm run build
```

**✅ Done when**: Build completes without errors

---

## ✅ Step 6: Verify All Assets (5 min)

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

### Check these files exist:

```
ios-assets/
├── firebase/
│   └── GoogleService-Info.plist ✅
├── icons/
│   ├── icon-20@2x.png ✅
│   ├── icon-20@3x.png ✅
│   ├── icon-29@2x.png ✅
│   ├── icon-29@3x.png ✅
│   ├── icon-40@2x.png ✅
│   ├── icon-40@3x.png ✅
│   ├── icon-60@2x.png ✅
│   ├── icon-60@3x.png ✅
│   └── icon-1024.png ✅
├── splash/
│   └── (splash images) ✅
└── sounds/
    └── notification_sound.mp3 ✅
```

**✅ Done when**: All required files are present

---

## ✅ Step 7: Commit to Git (2 min)

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

### Instructions:
```bash
git add ios-assets/
git add IOS_PREPARE_ON_WINDOWS.md
git add IOS_MACBOOK_ONLY_TASKS.md
git add IOS_WINDOWS_CHECKLIST.md
git commit -m "Prepare iOS assets for MacBook build"
git push
```

**✅ Done when**: All files are committed and pushed

---

## 🎉 Ready for MacBook!

Once all checkboxes are ✅, you're ready to rent a MacBook!

**Estimated MacBook time**: ~50 minutes (instead of 2-3 hours!)

See `IOS_MACBOOK_ONLY_TASKS.md` for what to do on MacBook.

---

## 📊 Progress Summary

- [ ] Step 1: Firebase (15 min)
- [ ] Step 2: Icons (30 min)
- [ ] Step 3: Splash (20 min)
- [ ] Step 4: Sound (5 min)
- [ ] Step 5: Build (5 min)
- [ ] Step 6: Verify (5 min)
- [ ] Step 7: Commit (2 min)

**Total Windows time**: ~1.5 hours
**MacBook time saved**: ~1.5-2 hours! 💰
