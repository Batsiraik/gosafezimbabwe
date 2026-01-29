# Custom Connection Error Page & Auto-Reload

**This fix works on both Android and iOS.**

- **Android:** Custom error page + cache clear + reload is implemented in `MainActivity.java` (and uses `android/.../assets/connection_error.html`).
- **iOS:** Custom error page is shown via Capacitor’s `server.errorPath`; the same `public/connection_error.html` is synced to the app and auto-redirects after 2.5s. Optional native cache-clear + reload (full parity with Android) is described in **`ios-assets/IOS_CONNECTION_ERROR_FIX.md`**.

---

## What Was Added

### 1. Custom Error Page (Your Colors, Your Message)

When a connection error is detected, users now see **your** page instead of the default "Web page not available":

- **Background:** Same as login page – `rgb(120, 90, 12)` (nexryde-yellow-darker)
- **Card:** Same style as login – frosted glass, rounded corners
- **Message:** "Connection issue – Please check your internet connection and try again. We're reconnecting you automatically."
- **Support:** "If the problem continues, please contact our support team for help."
- **Reconnecting:** "Reconnecting…" with a small loading animation

**Files:** `android/app/src/main/assets/connection_error.html` (Android), `public/connection_error.html` (synced to iOS and used as Capacitor `errorPath`).

### 2. Auto-Fix Flow (User Does Nothing)

Yes – the app **detects the error, fixes it, and reloads** without the user doing anything:

1. **Error detected** (e.g. ERR_NAME_NOT_RESOLVED, ERR_CONNECTION_ABORTED)
2. **Custom error page is shown** (your design, your message)
3. **After 2.5 seconds:**
   - Cache is cleared (HTTP/DNS only – **localStorage is kept**, user stays logged in)
   - App URL is loaded again
4. **User sees:** Your error page for ~2.5 seconds, then the app loads again and works.

So within a few seconds the app fixes itself and opens; the user does not need to tap anything or clear cache manually.

---

## Flow Summary

```
Connection error
    ↓
Show custom error page (your colors, "check internet", "contact support")
    ↓
"Reconnecting…" (2.5 seconds)
    ↓
Clear cache (localStorage preserved – user stays logged in)
    ↓
Reload app URL
    ↓
App loads and works – user does nothing
```

---

## Answers to Your Questions

### 1. Custom page instead of the default error?

**Yes.** When we detect that error, we show a custom page with:

- Same background as login (`rgb(120, 90, 12)`)
- Your branding and layout
- Message: check internet; if it persists, contact support
- "Reconnecting…" so they know something is happening

### 2. Will the app auto-fix and reload so the user doesn’t do anything?

**Yes.** The app will:

1. Detect the error
2. Show your custom error page
3. After 2.5 seconds: clear cache (without clearing localStorage)
4. Reload the app URL
5. Open the app again

So the user does nothing; within a few seconds the app has “fixed itself” and opened.

---

## Technical Details

- **Main frame only:** We only run this for main document load errors (not for failed images/scripts).
- **Reload URL:** We reload the **app URL** (e.g. `https://gosafezimbabwe.vercel.app`), not the error page.
- **Login preserved:** Only HTTP/DNS cache is cleared; **localStorage is not cleared**, so the user stays logged in.

---

## Rebuild Required

**Android:** Rebuild the app (error page is in `android/app/src/main/assets/`). Run `npx cap sync android` if needed. Test: e.g. turn off Wi‑Fi, open app → custom error page → after ~2.5 s, app reloads.

**iOS:** Run `npx cap sync ios` so `public/connection_error.html` is included. You get the custom error page and auto-redirect after 2.5s. For cache clear + reload (same as Android), see **`ios-assets/IOS_CONNECTION_ERROR_FIX.md`**.

---

## Summary

- **Custom error page:** Your colors, your copy, “check internet” and “contact support”.
- **Auto-fix:** Detect error → show your page → clear cache → reload app URL.
- **User:** Does nothing; app fixes itself and opens within seconds.
- **Login:** Preserved (localStorage not cleared).
