# 🚨 SECURITY FIX: Firebase Service Account Key Exposed

## ⚠️ What Happened

Your Firebase service account key was accidentally committed to GitHub and Google has **disabled it** for security reasons. You **MUST** generate a new key.

## ✅ Immediate Actions Required

### Step 1: Generate a NEW Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `gosafe-8da5a`
3. Click **⚙️ Settings** → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. **Download the NEW JSON file** (this is your new key - keep it secret!)

### Step 2: Add NEW Key to Vercel (NOT in code!)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `gosafezimbabwe`
3. Go to **Settings** → **Environment Variables**
4. **Delete the old variable** if it exists: `FIREBASE_SERVICE_ACCOUNT`
5. **Add NEW variable**:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Copy the **ENTIRE contents** of the NEW JSON file you just downloaded
   - **Environment**: Select all (Production, Preview, Development)
6. Click **Save**

### Step 3: Remove Old Key from Git History (Important!)

The old key is still in your git history. You should:

1. **Never commit service account keys to git again**
2. The file `VERCEL_FIREBASE_SETUP.md` has been cleaned up (good!)
3. Consider using `git filter-branch` or BFG Repo-Cleaner to remove it from history (optional but recommended)

### Step 4: Verify New Key Works

1. Wait for Vercel to redeploy
2. Check Vercel logs for Firebase initialization
3. Test notifications on your device

## 🔒 Security Best Practices

✅ **DO:**
- Store keys in Vercel environment variables
- Keep keys in `.env.local` for local development (never commit this!)
- Rotate keys if exposed

❌ **DON'T:**
- Commit keys to git
- Share keys in documentation
- Upload keys to public repositories
- Store keys in code files

## 📝 Important Notes

- The **old key is disabled** - you cannot use it anymore
- You **MUST** generate a new key
- The new key should **ONLY** be in Vercel environment variables
- Never commit the new key to git

---

**After completing these steps, your notifications will work again with the new secure key!** 🔐
