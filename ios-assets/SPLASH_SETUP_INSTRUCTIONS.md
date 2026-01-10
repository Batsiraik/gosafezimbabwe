# iOS Splash Screen - Setup Instructions

## 📱 Splash Screen Options

iOS supports two methods:
1. **LaunchScreen.storyboard** (modern, preferred) - Single file
2. **LaunchImage** (legacy) - Multiple image sizes

## 🚀 Quick Method (Online Tool)

1. Go to [Splash Screen Generator](https://www.appicon.co/#splash)
2. Upload your splash image
3. Select **iOS** platform
4. Download generated splash screens
5. Place in `ios-assets/splash/`

## 📐 Manual Sizes (For LaunchImage)

If using LaunchImage, create these PNG files:

- `Default@2x.png` - 750x1334px (iPhone 6/7/8)
- `Default@3x.png` - 1242x2208px (iPhone 6+/7+/8+)
- `Default-568h@2x.png` - 640x1136px (iPhone 5/SE)
- `Default-812h@3x.png` - 1125x2436px (iPhone X/XS)
- `Default-896h@2x.png` - 828x1792px (iPhone XR)
- `Default-896h@3x.png` - 1242x2688px (iPhone XS Max)

## 📁 Source Splash

Your Android splash is copied to: `ios-assets/splash/source-splash.png`

## 💡 Recommendation

**Use LaunchScreen.storyboard** (default in Capacitor) - it's simpler and works for all devices with a single file.

## ✅ Done!

Splash screens will be configured in Xcode on MacBook.
