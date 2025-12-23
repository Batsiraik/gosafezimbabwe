# Splash Screen Generator Tools

## Best Online Tools for Android Splash Screens

### 1. AppIcon.co (Recommended) ⭐
**URL:** https://www.appicon.co/

**Features:**
- ✅ Generates all Android splash screen sizes
- ✅ Supports both portrait and landscape
- ✅ Free to use
- ✅ Simple drag-and-drop interface
- ✅ Generates all required drawable folders

**How to use:**
1. Go to https://www.appicon.co/
2. Click "Splash Screen" tab
3. Upload your image (2732x2732px recommended)
4. Select "Android"
5. Download the generated files
6. Extract and copy to `android/app/src/main/res/drawable-*/` folders

---

### 2. Android Asset Studio (by Google)
**URL:** https://romannurik.github.io/AndroidAssetStudio/

**Features:**
- ✅ Official Google tool
- ✅ Generates splash screens
- ✅ Also generates icons
- ✅ Free and reliable

**How to use:**
1. Go to https://romannurik.github.io/AndroidAssetStudio/
2. Click "Launcher Icons" or "Generic Icons"
3. Upload your image
4. Customize settings
5. Download zip file
6. Extract and use the generated files

---

### 3. Icon Kitchen (by Google)
**URL:** https://icon.kitchen/

**Features:**
- ✅ Google's official icon generator
- ✅ Generates adaptive icons
- ✅ Can also generate splash screens
- ✅ Free

**Note:** Primarily for icons, but can be used for splash screens too.

---

### 4. MakeAppIcon
**URL:** https://makeappicon.com/

**Features:**
- ✅ Generates icons and splash screens
- ✅ Multiple platforms (Android, iOS)
- ✅ Free
- ✅ Simple interface

---

### 5. AppIcon Generator
**URL:** https://appicon.co/ (different from appicon.co)

**Features:**
- ✅ Icon and splash screen generator
- ✅ Free
- ✅ Easy to use

---

## Manual Method (Using Image Editor)

If you prefer to create them manually:

### Required Sizes for Splash Screens

**Portrait:**
- `drawable-port-mdpi/`: 320x480px
- `drawable-port-hdpi/`: 480x800px
- `drawable-port-xhdpi/`: 720x1280px
- `drawable-port-xxhdpi/`: 1080x1920px
- `drawable-port-xxxhdpi/`: 1440x2560px

**Landscape:**
- `drawable-land-mdpi/`: 480x320px
- `drawable-land-hdpi/`: 800x480px
- `drawable-land-xhdpi/`: 1280x720px
- `drawable-land-xxhdpi/`: 1920x1080px
- `drawable-land-xxxhdpi/`: 2560x1440px

**Base:**
- `drawable/splash.png`: 720x1280px (or your preferred base size)

### Tools for Manual Creation:
- **Photoshop** (paid)
- **GIMP** (free): https://www.gimp.org/
- **Canva** (free): https://www.canva.com/
- **Figma** (free): https://www.figma.com/
- **Photopea** (free, online): https://www.photopea.com/

---

## Recommended Workflow

### Step 1: Prepare Your Source Image
- Create a 2732x2732px PNG image
- Include your logo and "GO SAFE" text
- Use your brand colors (yellow theme)
- Save as high-quality PNG

### Step 2: Generate Using AppIcon.co
1. Go to **https://www.appicon.co/**
2. Click **"Splash Screen"** tab
3. **Upload** your 2732x2732px image
4. Select **"Android"**
5. **Download** the generated zip file

### Step 3: Extract and Place Files
1. **Extract** the zip file
2. You'll see folders like:
   - `drawable-port-mdpi/`
   - `drawable-port-hdpi/`
   - `drawable-port-xhdpi/`
   - `drawable-port-xxhdpi/`
   - `drawable-port-xxxhdpi/`
   - `drawable-land-mdpi/`
   - `drawable-land-hdpi/`
   - `drawable-land-xhdpi/`
   - `drawable-land-xxhdpi/`
   - `drawable-land-xxxhdpi/`
   - `drawable/` (base splash)

3. **Copy** all `splash.png` files to:
   ```
   android/app/src/main/res/
   ├── drawable/
   │   └── splash.png
   ├── drawable-port-mdpi/
   │   └── splash.png
   ├── drawable-port-hdpi/
   │   └── splash.png
   ├── drawable-port-xhdpi/
   │   └── splash.png
   ├── drawable-port-xxhdpi/
   │   └── splash.png
   ├── drawable-port-xxxhdpi/
   │   └── splash.png
   ├── drawable-land-mdpi/
   │   └── splash.png
   ├── drawable-land-hdpi/
   │   └── splash.png
   ├── drawable-land-xhdpi/
   │   └── splash.png
   ├── drawable-land-xxhdpi/
   │   └── splash.png
   └── drawable-land-xxxhdpi/
       └── splash.png
   ```

### Step 4: Sync and Rebuild
```bash
npx cap sync android
```

Then rebuild APK in Android Studio.

---

## Quick Links

- **AppIcon.co (Splash Screens)**: https://www.appicon.co/
- **Android Asset Studio**: https://romannurik.github.io/AndroidAssetStudio/
- **Icon Kitchen**: https://icon.kitchen/
- **MakeAppIcon**: https://makeappicon.com/

---

## Tips

1. **Use AppIcon.co** - It's the easiest and most comprehensive
2. **Start with high resolution** - 2732x2732px source image works best
3. **Test on device** - After rebuilding, test splash screen on actual phone
4. **Keep it simple** - Splash shows for 1-2 seconds, don't overcomplicate
5. **Match branding** - Use your app's colors and logo

---

**Recommended:** Use **AppIcon.co** - it's free, easy, and generates everything you need! 🚀
