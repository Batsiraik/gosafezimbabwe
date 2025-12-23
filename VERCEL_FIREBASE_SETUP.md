# Adding Firebase Service Account to Vercel

## ✅ Quick Steps

1. **Go to Vercel Dashboard**
   - Navigate to your project: `gosafezimbabwe`
   - Click **Settings** → **Environment Variables**

2. **Add New Variable**
   - Click **Add New**
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Paste your entire JSON (the one you showed me)
   - **Environment**: Select all three:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development

3. **Save**
   - Click **Save**
   - Vercel will automatically redeploy with the new variable

## 📋 Your JSON Value

⚠️ **SECURITY WARNING**: Never commit your service account key to git or share it publicly!

1. Download your service account JSON from Firebase Console
2. Copy the **entire contents** of the JSON file
3. Paste it as the value in Vercel (as a single-line JSON string)

## ✅ Verification

After adding the variable:

1. **Wait for redeploy** (Vercel will automatically redeploy)
2. **Check logs** - Go to your deployment → **Functions** tab
3. **Test a notification** - Create a ride request and check if drivers get notified
4. **Check Vercel logs** for any Firebase initialization errors

## 🔍 Troubleshooting

### If notifications don't work:

1. **Check Vercel logs** for errors like:
   - "Firebase Admin not initialized"
   - "Invalid service account"

2. **Verify the variable**:
   - Make sure it's named exactly: `FIREBASE_SERVICE_ACCOUNT`
   - Make sure it's set for all environments (Production, Preview, Development)

3. **Check JSON format**:
   - The JSON should be valid (no extra quotes or escaping)
   - The `\n` characters in the private key are correct (they'll be converted to newlines)

4. **Redeploy manually**:
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment

## 🎯 Next Steps After Adding

1. ✅ Add variable to Vercel (you're doing this now!)
2. ✅ Push database changes: `npx prisma db push`
3. ✅ Rebuild APK with Firebase
4. ✅ Test notifications on device

---

**That's it!** Once you add this variable to Vercel, notifications will start working automatically! 🚀
