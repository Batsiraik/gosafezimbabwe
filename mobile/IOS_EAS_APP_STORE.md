# iOS update → Apple (TestFlight / App Store) with **Expo EAS**

Run everything from the **`mobile`** folder (where `app.json`, `eas.json`, `package.json` live).

## 0. EAS must see `mobile/` in Git

If the build log says **`package.json does not exist in .../build/mobile`**, the **`mobile/`** app was **not in the Git repo** EAS uploads (e.g. root `.gitignore` used to ignore all of `mobile/`).

**Fix:** Track **`mobile/`** in Git (with secrets still ignored — see root `.gitignore`), then **commit & push** before:

```powershell
npx eas-cli build --platform ios --profile production
```

## 1. Bump versions (required every upload)

Apple needs a **new iOS build number** each time (`CFBundleVersion`).

1. Open **[App Store Connect](https://appstoreconnect.apple.com)** → your app → **TestFlight** or **App Store** tab and note the **latest build number** already uploaded (e.g. `12`).
2. In **`app.json`** set **`expo.ios.buildNumber`** to a **higher** string, e.g. `"13"`.
3. Optionally bump **`expo.version`** (marketing version users see), e.g. `"6.0.6"`.

```json
"ios": {
  "buildNumber": "13",
  ...
}
```

## 2. Login & org

```powershell
cd C:\Users\Admin\Documents\gosafezimbabwe\mobile
npm install
npx eas-cli login
npx eas-cli whoami
```

- **`owner` in `app.json`:** Must match the Expo account that **owns** `extra.eas.projectId`. If you see *Owner … does not match owner specified in the "owner" field*, either **remove** the `"owner"` line (uses the account tied to the project, often **batsie**) **or** [transfer the project](https://docs.expo.dev/accounts/account-types/#transfer-projects-between-accounts) to **passdrive-zimbabwe** on [expo.dev](https://expo.dev) and then set `"owner": "passdrive-zimbabwe"` again.

## 3. Cloud iOS build (store binary)

**Production / App Store–style build** (matches your **`eas.json`** `production` profile):

```powershell
npx eas-cli build --platform ios --profile production
```

- First time (or after credential change), EAS may ask for **Apple ID**, **App Store Connect API key**, or to **let EAS manage** certificates/profiles — same flow as last week.
- Wait for the build on [expo.dev](https://expo.dev) → your project → **Builds**.

## 4. Submit to Apple (upload for TestFlight / review)

When the build finishes:

```powershell
npx eas-cli submit --platform ios --profile production --latest
```

Your **`eas.json`** already has **`submit.production.ios.ascAppId`** (`6748540748`) so submit can target the right App Store Connect app.

**Or** submit a specific file:

```powershell
npx eas-cli submit --platform ios --path ".\YourApp.ipa"
```

(Download the **`.ipa`** from the EAS build page if you use `--path`.)

## 5. In App Store Connect

- **TestFlight**: processing → then add to internal/external testing.
- **App Store**: attach the new build to a version and **Submit for review** when ready.

## Useful extras

```powershell
# List recent builds
npx eas-cli build:list --platform ios --limit 5

# Non-interactive / CI (after credentials exist)
npx eas-cli build --platform ios --profile production --non-interactive
```

## Local Mac build (optional)

Only if you have Xcode on a Mac:

```powershell
npx expo prebuild --platform ios
cd ios
xcodebuild archive ...
```

For most teams, **EAS `build --platform ios`** is what you used “last week” — no Mac required for the compile step.

---

**Checklist:** `[ ]` `buildNumber` increased · `[ ]` `eas login` · `[ ]` `eas build --platform ios --profile production` · `[ ]` `eas submit --platform ios --profile production --latest` · `[ ]` TestFlight / review in App Store Connect
