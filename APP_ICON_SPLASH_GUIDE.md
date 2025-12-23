# Adding App Icon and Splash Screen

## Overview

Your app already has the structure in place! You just need to replace the existing icon and splash screen images with your custom ones.

---

## Part 1: App Icon

### What You Need

You need **one source image** (preferably 1024x1024px PNG) with your app logo/icon.

### Required Sizes

Android requires icons in multiple sizes for different screen densities:

| Folder | Size | Purpose |
|--------|------|---------|
| `mipmap-mdpi` | 48x48px | Low density |
| `mipmap-hdpi` | 72x72px | Medium density |
| `mipmap-xhdpi` | 96x96px | High density |
| `mipmap-xxhdpi` | 144x144px | Extra high density |
| `mipmap-xxxhdpi` | 192x192px | Extra extra high density |

**For adaptive icons** (Android 8.0+), you also need:
- **Foreground**: Your logo/icon (transparent background recommended)
- **Background**: Solid color or pattern

### Option 1: Use Online Generator (Easiest) ⭐ RECOMMENDED

1. **Go to**: https://www.appicon.co/ or https://icon.kitchen/
2. **Upload** your 1024x1024px icon image
3. **Select**: Android
4. **Download** the generated icons
5. **Extract** the zip file
6. **Copy** the icons to these folders:

```
android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png
│   ├── ic_launcher_foreground.png
│   └── ic_launcher_round.png
├── mipmap-hdpi/
│   ├── ic_launcher.png
│   ├── ic_launcher_foreground.png
│   └── ic_launcher_round.png
├── mipmap-xhdpi/
│   ├── ic_launcher.png
│   ├── ic_launcher_foreground.png
│   └── ic_launcher_round.png
├── mipmap-xxhdpi/
│   ├── ic_launcher.png
│   ├── ic_launcher_foreground.png
│   └── ic_launcher_round.png
└── mipmap-xxxhdpi/
    ├── ic_launcher.png
    ├── ic_launcher_foreground.png
    └── ic_launcher_round.png
```

### Option 2: Manual Creation

1. **Create your icon** (1024x1024px PNG)
2. **Resize** to each required size using an image editor
3. **Save** as `ic_launcher.png`, `ic_launcher_foreground.png`, and `ic_launcher_round.png` in each folder

### Option 3: Use Capacitor Assets Plugin

```bash
npm install -D @capacitor/assets
```

Create a `assets` folder in your project root:
```
assets/
├── icon.png (1024x1024px)
└── splash.png (2732x2732px)
```

Then run:
```bash
npx capacitor-assets generate
```

This will automatically generate all required sizes!

---

## Part 2: Splash Screen

### What You Need

You need **one source image** (preferably 2732x2732px PNG) for the splash screen.

### Required Sizes

Android requires splash screens in multiple sizes and orientations:

| Folder | Size | Orientation |
|--------|------|-------------|
| `drawable-port-mdpi` | 320x480px | Portrait |
| `drawable-port-hdpi` | 480x800px | Portrait |
| `drawable-port-xhdpi` | 720x1280px | Portrait |
| `drawable-port-xxhdpi` | 1080x1920px | Portrait |
| `drawable-port-xxxhdpi` | 1440x2560px | Portrait |
| `drawable-land-mdpi` | 480x320px | Landscape |
| `drawable-land-hdpi` | 800x480px | Landscape |
| `drawable-land-xhdpi` | 1280x720px | Landscape |
| `drawable-land-xxhdpi` | 1920x1080px | Landscape |
| `drawable-land-xxxhdpi` | 2560x1440px | Landscape |

**Also need:**
- `drawable/splash.png` (base splash, 720x1280px recommended)

### Option 1: Use Online Generator

1. **Go to**: https://www.appicon.co/ (has splash screen generator too)
2. **Upload** your splash screen image (2732x2732px)
3. **Select**: Android Splash Screen
4. **Download** and extract
5. **Copy** all splash.png files to their respective folders

### Option 2: Manual Creation

1. **Create your splash screen** (2732x2732px PNG)
2. **Resize** to each required size
3. **Save** as `splash.png` in each folder

### Option 3: Use Capacitor Assets Plugin

Same as icons - the plugin generates splash screens too!

---

## Part 3: Update Background Color (Optional)

### For App Icon Background

Edit `android/app/src/main/res/values/ic_launcher_background.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFD700</color> <!-- Your brand color -->
</resources>
```

Or edit `android/app/src/main/res/drawable/ic_launcher_background.xml` to use a pattern/image.

### For Splash Screen Background

The splash screen uses `@drawable/splash` which references `drawable/splash.png`. You can also modify `android/app/src/main/res/values/styles.xml`:

```xml
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
    <item name="android:background">@drawable/splash</item>
    <!-- Or use a solid color: -->
    <!-- <item name="android:windowBackground">@color/splash_background</item> -->
</style>
```

---

## Step-by-Step Instructions

### Quick Method (Using Online Generator)

1. **Prepare your images:**
   - App icon: 1024x1024px PNG (square, transparent background recommended)
   - Splash screen: 2732x2732px PNG (can be same as icon or different design)

2. **Generate icons:**
   - Go to https://www.appicon.co/
   - Upload your icon
   - Select Android
   - Download and extract

3. **Generate splash screens:**
   - Same site, use splash screen generator
   - Upload your splash image
   - Download and extract

4. **Replace files:**
   - Copy all generated icons to `android/app/src/main/res/mipmap-*/`
   - Copy all generated splash screens to `android/app/src/main/res/drawable-*/`

5. **Sync and rebuild:**
   ```bash
   npx cap sync android
   ```
   Then rebuild APK in Android Studio

### Manual Method

1. **Create your images** (1024x1024px icon, 2732x2732px splash)

2. **Resize icon** to:
   - 48x48px → `mipmap-mdpi/ic_launcher.png`
   - 72x72px → `mipmap-hdpi/ic_launcher.png`
   - 96x96px → `mipmap-xhdpi/ic_launcher.png`
   - 144x144px → `mipmap-xxhdpi/ic_launcher.png`
   - 192x192px → `mipmap-xxxhdpi/ic_launcher.png`
   
   Repeat for `ic_launcher_foreground.png` and `ic_launcher_round.png`

3. **Resize splash** to all required sizes and place in respective folders

4. **Sync and rebuild**

---

## Design Tips

### App Icon
- ✅ Use simple, recognizable design
- ✅ Ensure it looks good at small sizes (48x48px)
- ✅ Use high contrast colors
- ✅ Avoid text (hard to read at small sizes)
- ✅ Test on different backgrounds

### Splash Screen
- ✅ Match your app's branding
- ✅ Can include logo + text
- ✅ Use your brand colors
- ✅ Keep it simple (shows for 1-2 seconds)
- ✅ Ensure logo is centered

---

## After Adding Icons/Splash

1. **Sync Capacitor:**
   ```bash
   npx cap sync android
   ```

2. **Clean build in Android Studio:**
   - Build → Clean Project
   - Build → Rebuild Project

3. **Build new APK:**
   - Build → Build Bundle(s) / APK(s) → Build APK(s)

4. **Test on device:**
   - Install new APK
   - Check icon appears correctly
   - Check splash screen shows on app launch

---

## Troubleshooting

### Icon not showing
- ✅ Make sure all sizes are present
- ✅ Check file names are exactly `ic_launcher.png`
- ✅ Run `npx cap sync android`
- ✅ Clean and rebuild

### Splash screen not showing
- ✅ Check `drawable/splash.png` exists
- ✅ Verify `styles.xml` references `@drawable/splash`
- ✅ Check all orientation folders have splash.png

### Icon looks blurry
- ✅ Use higher resolution source image (1024x1024px minimum)
- ✅ Ensure each size is properly resized (not just scaled)

---

## Current File Structure

Your app already has this structure:
```
android/app/src/main/res/
├── drawable/
│   └── splash.png (replace this)
├── drawable-port-*/ (replace splash.png in each)
├── drawable-land-*/ (replace splash.png in each)
├── mipmap-*/
│   ├── ic_launcher.png (replace)
│   ├── ic_launcher_foreground.png (replace)
│   └── ic_launcher_round.png (replace)
└── values/
    └── ic_launcher_background.xml (edit for background color)
```

---

## Quick Checklist

- [ ] Create 1024x1024px app icon
- [ ] Create 2732x2732px splash screen
- [ ] Generate all required sizes (use online tool or manually)
- [ ] Replace icons in `mipmap-*/` folders
- [ ] Replace splash screens in `drawable-*/` folders
- [ ] Update background color (optional)
- [ ] Run `npx cap sync android`
- [ ] Clean and rebuild in Android Studio
- [ ] Test on device

---

## Recommended Tools

- **AppIcon.co**: https://www.appicon.co/ (Free, easy to use)
- **Icon Kitchen**: https://icon.kitchen/ (Google's tool)
- **Figma**: For designing icons (free)
- **Canva**: For quick icon/splash creation (free)
- **Photoshop/GIMP**: For advanced editing

---

**Note:** After adding icons/splash, you **MUST rebuild the APK** - this is a native change! 📱
