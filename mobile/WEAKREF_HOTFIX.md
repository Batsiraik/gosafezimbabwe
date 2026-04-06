# WeakRef crash hotfix (Android / iOS)

## What happened

`Property 'WeakRef' doesn't exist` — React 19 / some dependencies expect ES2021 `WeakRef`. **Hermes** on some devices does not expose it, so the app crashed at startup before your screens load.

## Fix (in this repo)

1. **`polyfills.js`** — defines minimal `WeakRef` + `FinalizationRegistry` when missing.
2. **`index.js`** — imports `./polyfills` **before** `expo-router/entry` so polyfills run first.
3. **`package.json`** — `"main": "./index.js"` (was `expo-router/entry`).

## iOS

The **same bundle** runs on iOS. If the engine lacked `WeakRef`, you’d see the same class of error. This entry polyfill applies to **both** platforms. Still **verify a TestFlight/internal build** before relying on App Review.

## Ship

Bump `version` / `versionCode` / `buildNumber`, build with EAS, submit to Play + App Store.
