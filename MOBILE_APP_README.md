# React Native (Expo) app – same backend, new mobile client

The **mobile** folder is a separate React Native Expo app that uses the **same** Next.js backend (Vercel + database + admin). No new backend; just a new client.

## Quick start

```bash
cd mobile
npm install
npx expo start
```

Then press **a** (Android) or **i** (iOS), or scan the QR code with Expo Go.

## What’s in `mobile/`

- **Login** – Same design as Next.js, calls `POST /api/auth/login`, stores token/user (nexryde_token, nexryde_user).
- **Dashboard** – Placeholder; add more screens here (ride, parcel, driver flows, etc.).
- **Theme** – Matches Next.js (nexryde-yellow-darker, card, primary button).
- **API** – All requests go to `https://gosafezimbabwe.vercel.app/api/*`.

## Next steps

1. Add screens one by one (register, forgot-password, ride, parcel, driver dashboards, etc.) reusing the same API routes as the Next.js app.
2. Keep the same designs (colors, layout) using `lib/theme.ts`.
3. When ready, build for stores: `npx expo prebuild` then EAS Build or `expo run:android` / `expo run:ios`.

See **mobile/README.md** for full details.
