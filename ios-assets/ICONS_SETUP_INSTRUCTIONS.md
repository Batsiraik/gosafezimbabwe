# iOS App Icons - Setup Instructions

## 📱 Required Icon Sizes

iOS needs these icon sizes. Generate them from a 1024x1024px source image.

## 🚀 Quick Method (Online Tool)

1. Go to [App Icon Generator](https://www.appicon.co/)
2. Upload your source icon (1024x1024px PNG)
3. Select **iOS** platform
4. Download the generated icon set
5. Extract all files to `ios-assets/icons/`

## 📐 Manual Sizes (If Needed)

Create these PNG files and save in `ios-assets/icons/`:

- `icon-20@2x.png` - 40x40px (Settings)
- `icon-20@3x.png` - 60x60px (Settings)
- `icon-29@2x.png` - 58x58px (Settings)
- `icon-29@3x.png` - 87x87px (Settings)
- `icon-40@2x.png` - 80x80px (Spotlight)
- `icon-40@3x.png` - 120x120px (Spotlight)
- `icon-60@2x.png` - 120x120px (Home Screen)
- `icon-60@3x.png` - 180x180px (Home Screen)
- `icon-1024.png` - 1024x1024px (App Store)

## 📁 Source Icon

Your Android icon is copied to: `ios-assets/icons/source-icon.png`

You can use this as a base, but ideally use a 1024x1024px version.

## ✅ Done!

All icons will be added to Xcode Assets.xcassets → AppIcon on MacBook.
