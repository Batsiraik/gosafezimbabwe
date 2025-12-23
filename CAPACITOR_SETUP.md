# Capacitor Setup Guide - GO SAFE App

## ✅ Phase 1 Complete: Capacitor Integration

Your Next.js app has been successfully integrated with Capacitor! Here's what was set up:

### What's Been Done:
1. ✅ Installed Capacitor core packages (`@capacitor/core`, `@capacitor/cli`)
2. ✅ Installed platform packages (`@capacitor/android`, `@capacitor/ios`)
3. ✅ Initialized Capacitor with app ID: `com.gosafezw.app`
4. ✅ Created Android native project
5. ✅ Created iOS native project (requires macOS to build)
6. ✅ Configured Capacitor to work with Next.js

### Current Configuration:
- **App Name**: GO SAFE
- **App ID**: com.gosafezw.app
- **Development Mode**: Currently configured to load from `http://localhost:3000`
- **Web Directory**: `public` (for Capacitor assets)

---

## 🚀 Next Steps: Build APK and Test on Real Device

### Prerequisites:
1. **Android Studio** - Download from [developer.android.com](https://developer.android.com/studio)
2. **Java JDK** - Android Studio usually includes this
3. **Android SDK** - Installed via Android Studio

### Current Configuration:
✅ **App is configured to load from:** `https://gosafezimbabwe.vercel.app`
✅ **No localhost needed** - Works on any device with internet
✅ **Ready to build APK** - Can install directly on your phone

### Steps to Build APK:

1. **Open Android project in Android Studio:**
   ```bash
   npm run cap:android
   ```
   Or manually: Open Android Studio → Open → Select `android` folder

2. **Wait for Android Studio to sync** (may take a few minutes on first open)

3. **Build the APK:**
   - In Android Studio, go to: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Wait for the build to complete
   - You'll see a notification: "APK(s) generated successfully"
   - Click "locate" in the notification to find your APK
   - Or navigate to: `android/app/build/outputs/apk/debug/app-debug.apk`

4. **Install on your phone:**
   - Transfer the APK to your phone (USB, email, cloud storage, etc.)
   - On your phone, enable "Install from Unknown Sources" in Settings
   - Open the APK file and install
   - Launch the app - it will load your live Vercel app!

### Alternative: Direct Install via USB (Faster for Testing)

1. **Connect your phone via USB**
2. **Enable USB Debugging** on your phone
3. **In Android Studio, click Run** (green play button)
4. **Select your device** and click OK
5. **App installs and launches automatically**

### Testing:
- The app will load `https://gosafezimbabwe.vercel.app`
- All your API routes will work (they're on Vercel)
- You can test all features on your real device
- Any changes you deploy to Vercel will be reflected in the app (after restart)

---

## 🔄 Development Workflow: Add Features → Deploy → Test

Since your app is live on Vercel, here's the best workflow:

### Workflow:
1. **Make changes** to your code locally
2. **Deploy to Vercel** (push to GitHub or use Vercel CLI)
3. **Wait for deployment** to complete (~2-3 minutes)
4. **Test on your phone** - The app will automatically load the latest version
5. **Repeat** for each feature

### Quick Deploy Commands:
```bash
# If using Vercel CLI
vercel --prod

# Or push to GitHub (if connected to Vercel)
git add .
git commit -m "Add new feature"
git push
```

### Testing After Deployment:
- **Restart the app** on your phone (close and reopen)
- Or **uninstall and reinstall** the APK if you made Capacitor config changes
- The app will load the latest version from Vercel automatically

### When to Rebuild APK:
You only need to rebuild the APK if you:
- Change Capacitor configuration (`capacitor.config.ts`)
- Add new Capacitor plugins
- Change app name, ID, or icons
- Otherwise, just deploy to Vercel and restart the app!

---

## 📱 For Production Build (APK)

When you're ready to build an APK for testing:

1. **Update Capacitor config for production:**
   - Comment out the `server.url` in `capacitor.config.ts`
   - Build your Next.js app: `npm run build`
   - Export static files (we'll configure this in Phase 2)

2. **Build APK in Android Studio:**
   - Open Android Studio
   - Build → Generate Signed Bundle / APK
   - Follow the wizard to create your APK

---

## 🍎 For iOS (Requires macOS)

1. **Install Xcode** from Mac App Store
2. **Install CocoaPods:**
   ```bash
   sudo gem install cocoapods
   ```
3. **Open iOS project:**
   ```bash
   npm run cap:ios
   ```
4. **Install dependencies:**
   ```bash
   cd ios/App
   pod install
   ```
5. **Run in Xcode** - Open the `.xcworkspace` file

---

## 🔧 Useful Commands

```bash
# Sync web assets to native projects
npm run cap:sync

# Sync specific platform
npm run cap:sync:android
npm run cap:sync:ios

# Open native projects
npm run cap:android    # Opens Android Studio
npm run cap:ios        # Opens Xcode (macOS only)
```

---

## ⚠️ Important Notes

### Development Mode:
- Currently configured to load from `http://localhost:3000`
- Your Next.js dev server must be running
- For testing on a real device, ensure:
  - Device and computer are on the same WiFi network
  - Or use `adb reverse tcp:3000 tcp:3000` for USB connection

### API Routes:
- Your Next.js API routes will continue to work
- They'll be accessible from the native app
- For production, you'll need to deploy your Next.js API or configure static export

### Next Phase:
- **Phase 2**: Improve location accuracy with native Geolocation plugin
- **Phase 3**: Add push notifications
- **Phase 4**: Configure for production builds

---

## 🐛 Troubleshooting

### App shows blank screen:
- Make sure Next.js dev server is running on port 3000
- Check that `server.url` is uncommented in `capacitor.config.ts`
- Verify your device/emulator can reach `http://localhost:3000`

### Can't connect to localhost:
- Use your computer's local IP address instead:
  - Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
  - Update `capacitor.config.ts` with: `url: 'http://YOUR_IP:3000'`

### Build errors:
- Make sure Android Studio is fully installed
- Run `npm run cap:sync` after any code changes
- Clean and rebuild in Android Studio

---

## 📚 Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Android Studio Guide](https://developer.android.com/studio)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)

---

**Ready for Phase 2?** Once you've tested the app on a device, we can move to improving location accuracy! 🎯
