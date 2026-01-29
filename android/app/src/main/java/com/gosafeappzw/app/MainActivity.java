package com.gosafeappzw.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Create notification channel with custom sound (required for Android 8.0+)
        createNotificationChannel();
        
        // Configure WebView to handle errors and clear cache on connection failures
        configureWebView();
    }
    
    private void configureWebView() {
        // This will be called after the bridge is initialized
        // We'll set up error handling in onStart
    }
    
    @Override
    public void onStart() {
        super.onStart();
        
        // Clear WebView cache if there were previous connection errors
        // This prevents ERR_NAME_NOT_RESOLVED and ERR_CONNECTION_ABORTED
        try {
            Bridge bridge = this.getBridge();
            if (bridge != null && bridge.getWebView() != null) {
                WebView webView = bridge.getWebView();
                
                // Set up error handling
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                        super.onReceivedError(view, request, error);
                        
                        // Only handle main document load errors (not images, scripts, etc.)
                        if (request != null && !request.isForMainFrame()) {
                            return;
                        }
                        
                        String errorCode = String.valueOf(error.getErrorCode());
                        String description = error.getDescription().toString();
                        // Save the app URL so we reload it (not the error page) after clearing cache
                        final String appUrl = (request != null && request.getUrl() != null)
                            ? request.getUrl().toString() : "https://gosafezimbabwe.vercel.app";
                        
                        Log.e(TAG, "WebView Error: " + errorCode + " - " + description);
                        Log.e(TAG, "Failed URL: " + appUrl);
                        
                        // Show custom error page and auto-fix (clear cache + reload app URL)
                        // IMPORTANT: clearCache() does NOT clear localStorage, so users stay logged in!
                        if (errorCode.contains("ERR_NAME_NOT_RESOLVED") || 
                            errorCode.contains("ERR_CONNECTION_ABORTED") ||
                            errorCode.contains("ERR_INTERNET_DISCONNECTED") ||
                            description.contains("net::ERR")) {
                            
                            Log.w(TAG, "Connection error detected - showing custom error page");
                            Log.d(TAG, "Note: localStorage will be preserved (users stay logged in)");
                            
                            // 1. Show custom error page (same colors as login - check internet, contact support)
                            try {
                                webView.loadUrl("file:///android_asset/connection_error.html");
                                Log.d(TAG, "✅ Custom error page displayed");
                            } catch (Exception e) {
                                Log.e(TAG, "Error loading error page: " + e.getMessage());
                            }
                            
                            // 2. After 2.5 seconds: clear cache and reload APP URL - app fixes itself, user does nothing
                            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                                try {
                                    // Clear only HTTP cache (preserves localStorage - users stay logged in)
                                    webView.clearCache(true);
                                    webView.clearFormData();
                                    webView.clearHistory();
                                    Log.d(TAG, "✅ WebView cache cleared (localStorage preserved)");
                                    
                                    // Auto-reload: load app URL again (not error page) - user sees it fix itself within seconds
                                    webView.loadUrl(appUrl);
                                    Log.d(TAG, "✅ App auto-reloading - user does not need to do anything");
                                } catch (Exception e) {
                                    Log.e(TAG, "Error clearing cache: " + e.getMessage());
                                }
                            }, 2500);
                        }
                    }
                });
                
                // Configure WebView settings for better reliability
                android.webkit.WebSettings settings = webView.getSettings();
                settings.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                
                Log.d(TAG, "✅ WebView error handling configured");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error configuring WebView: " + e.getMessage());
        }
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            
            // Delete existing channel if it exists (to ensure sound is properly configured)
            if (notificationManager.getNotificationChannel("default") != null) {
                Log.d(TAG, "Deleting existing 'default' notification channel");
                notificationManager.deleteNotificationChannel("default");
            }
            
            // Create the notification channel with custom sound
            NotificationChannel channel = new NotificationChannel(
                "default",
                "GO SAFE Notifications",
                NotificationManager.IMPORTANCE_HIGH
            );
            
            channel.setDescription("Notifications for ride requests, bids, and updates");
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setShowBadge(true);
            
            // Try OGG first (more reliable), then fallback to MP3
            Uri soundUri = null;
            String packageName = getPackageName();
            
            // Try OGG format first (recommended for Android)
            try {
                soundUri = Uri.parse("android.resource://" + packageName + "/raw/notification_sound");
                Log.d(TAG, "Attempting to use sound URI: " + soundUri.toString());
                
                // Verify the resource exists by trying to open it
                try {
                    android.content.res.Resources res = getResources();
                    int resId = res.getIdentifier("notification_sound", "raw", packageName);
                    if (resId != 0) {
                        Log.d(TAG, "✅ Sound resource found! Resource ID: " + resId);
                    } else {
                        Log.e(TAG, "❌ Sound resource NOT found! Check if file exists in res/raw/");
                        // Fallback to default notification sound
                        soundUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);
                        Log.w(TAG, "Using default notification sound as fallback");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error checking sound resource: " + e.getMessage());
                    soundUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error creating sound URI: " + e.getMessage());
                soundUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);
            }
            
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            
            channel.setSound(soundUri, audioAttributes);
            Log.d(TAG, "✅ Notification channel created with sound: " + soundUri.toString());
            
            // Create the channel
            notificationManager.createNotificationChannel(channel);
            Log.d(TAG, "✅ Notification channel 'default' created successfully");
        } else {
            Log.d(TAG, "Android version < 8.0, notification channels not required");
        }
    }
}
