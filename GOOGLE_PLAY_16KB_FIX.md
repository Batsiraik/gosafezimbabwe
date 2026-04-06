# Google Play: 16 KB memory page size — what fixed it

## What Google required

From **November 2025**, updates that **target Android 15 (API 35)** must:

1. **Target API 35** (separate policy).
2. Support **16 KB memory page sizes** on **64-bit** devices for any app that ships **native `.so` libraries** (React Native / Expo always do).

Play rejects the bundle if those libraries are built for **4 KB** ELF alignment only.

## Why the old stack failed

- **Expo SDK 52** + **React Native 0.76** shipped native binaries (**Hermes**, **`libreactnative.so`**, **`libexpo-modules-core.so`**, etc.) that did **not** meet Play’s **16 KB** requirement when combined with **targetSdk 35**.
- Tweaks like **NDK version** or **Gradle alone** on SDK 52 were **not** enough: the **prebuilt `.so` files** from that generation were still wrong for Play’s checker.

Official Expo reference: **[expo/fyi — android-16kb-page-sizes](https://github.com/expo/fyi/blob/main/android-16kb-page-sizes.md)**  
(Requires **`expo` ≥ 53.0.14** and the React Native line bundled with **Expo SDK 53**.)

## What we changed (the actual fix)

1. **Upgraded the mobile app to Expo SDK 53** (e.g. `expo ~53.0.27`) and **React Native 0.79.x**, with matching **`expo-router` 5**, **React 19**, and **`npx expo install --fix`** / aligned dependencies.
2. **`.npmrc`** in `mobile/` with `legacy-peer-deps=true` so **`expo-router` / `react-native-reanimated`** peer dependency ranges resolve under npm.
3. **`npx expo prebuild --platform android --clean`** so the **`mobile/android`** tree matches SDK 53 / RN 0.79 (fresh native project + correct **NDK 27.1** usage from RN for rebuilt modules).
4. **API 35**: `compileSdkVersion` / `targetSdkVersion` **35** via **`gradle.properties`** and **`expo-build-properties`** in `app.json`.
5. **`newArchEnabled: false`** in `app.json` / `gradle.properties` (kept old architecture for stability; not required for 16 KB by itself).
6. After prebuild, **re-applied**:
   - **Play signing** in `mobile/android/app/build.gradle`
   - **`keystore.defaults.properties`** + gitignored **`keystore.properties`**
   - **`local.properties`** with **`sdk.dir=...`** (prebuild removes it)
7. **Release bundle**: from `mobile/android`,  
   `.\gradlew.bat bundleRelease`  
   (optionally `NODE_ENV=production` for env loading).

## What did *not* fix it by itself

- Only raising **targetSdk** to 35 on **Expo 52**.
- Pointing at **NDK 28** with a broken/partial SDK install (**CXX1101** / missing `source.properties`).
- Expecting **Capacitor / root `android/`** notes to apply to the **Expo `mobile/android`** project without upgrading the JS/native stack.

## Verify after a future upgrade

- Play Console → **App bundle explorer** → memory page size / 16 KB line.
- Or use Google’s **[16 KB page size](https://developer.android.com/guide/practices/page-sizes)** guidance (`zipalign`, `llvm-objdump`, etc.) on a release **APK** extracted from the **AAB**.

## Versioning

Increment **`android.versionCode`** (and **`version`**) in **`mobile/app.json`** and sync **`versionCode` / `versionName`** in **`mobile/android/app/build.gradle`** for **every** new Play upload.

---

*Single project note: other troubleshooting `.md` files were removed from the repo in favour of this document and your separate Word notes. If anything odd appears in `node_modules`, run `npm install` again in the repo root and in `mobile/`.*
