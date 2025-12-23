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

You can paste this directly (it's already properly formatted):

```json
{"type":"service_account","project_id":"gosafe-8da5a","private_key_id":"a3eb0d8e9dc57f2813180aa35025d3567de177c7","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3xE70wE91w/x6\n9RSr2RjO1TnDzbVlonX/9CKzO/RGGYuDnCu2Qya3PEgDtDHIkJuFaQPWy/gZMmEz\n5AnEPkM4wtatMuYaehaYz/rabvdxQeR/v3OiOeqLhp8dnRQTANQNUQsa1UddQ/+s\nZyHodpgD7otZFb/Ncf91jNlP/AwC20yB8sVBpIUvahUjuHuH7tY/wRFNaf2T8d/z\nGTT/QIcoQHhPUytDrbsdmxz6ci5eGtILphjsH+hLu0FLqJg93FR45nJhV7uELP9Q\nULs0Rw7GDY/wmG2P5k/X//gxVcnr6bux0UVX2WlGpZMV160gGOW0jBhJQu2zk+YK\na663qCV1AgMBAAECggEABRZhMoi/FRKM7dZ/xlYnR//tLneGcGmJUhcEfZPI/8Z7\nRJ8mh/rfRS6yYQU0ZPS5PtNDxkbf98qbmEqANAzz4swPZ2duVAinPCnIgb2VX275\n5XN7vwpSwklteZi8p94GViwKiP6jOs4Zc5YTVpKEmNnvb6hDfBY41/Ht84yVxIpu\nVpDzRYu/tavigmtOYgBT68126WinR97eYlg3UTChSLdc+A8ArfBwMLzsm0kckc4q\n+YlNwxuZYuZ7XVDc76lpM95YRJso4DxjhX/HUh+dn22vpvKbJXOPyvVTt2es4yyW\n69N5iNCstnrCcxKEYnRJXxRVCSCXk6cv08xGIbygjQKBgQDc0zizh79WCD68PL5m\nl6259MhufdbpacE2WdHYKdul3UvZqcsvcftPh8R2ROwvW8BKlkiH4KA9Vb0J82Kb\nJUs1mnlVyacz2eLP0QUWV2HSfOhMVaHTbg8qf2WAYrWgi1cIGnE4d9oZgZjxPfrJ\nOJiW4GkqqjfKgHT7oyzbJp7gNwKBgQDVCe4QPsKgQTxZAB5TNrQR4VP3lPxh1hL+\n7u9dY0CxIRlZivYr8SU1kRJtrPTHbZQg39sOJC/gmhv/Z3rddn1WwGOXfxP7x9YM\nbTFIsTX6z0lrxqrdqc6BIMIpoRbs6geoqwavGPi/HzEXuzl7BmazGSDjuf+0BsFM\nqDsG1LQZswKBgQCCVMfqbfwnssYUI2Xc9zi5wBdr3ymwqZI3mduYUVwqEOprlSMu\n5X8F+YOiqhsb+HMNkpVMXO82RBxGezd/igtRn9JtJ49fswGC1kLCZOB/culH5GKW\nfybEVlx54ciA8Lx1M+YPBe3bj/nMqGAT0yt8IQbw/3XeNuLUggI/dhPfEQKBgHA+\n1SHWD3GkLYmvGEs7zVCGallONFPQGR4dAh0wSEuLZvHY1697VOGOWClVMXtJ7vwL\nNj2TL26lhA7jlMbOwWdN4qtVl0/XkJ3ngkoMpKZLRSH2ANzdtSIwAl0wtQWKoRJr\nWhAzlgwNAS7BxJ1fWAkROlUCEQnnbT1YfhExTNslAoGBAKZXnk0VkHtR5uTe2Sum\n63CzGmvPEfUCXa5IzdEuXhh6k75hPDT3/MLlCb4NrPCn+G0Q1HMCcrWUpgDGeTiH\nEB3QvblGoDE/qYyOFUQgljZeMRZTYoRxmDeyTKMUgPv/vbk4LnZubTaWwMa2zj9S\nyxzxXFeXglkKw2UZGHPPwb3+\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-9ig85@gosafe-8da5a.iam.gserviceaccount.com","client_id":"100768261110459475293","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-9ig85%40gosafe-8da5a.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
```

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
