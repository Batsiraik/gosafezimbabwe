package com.gosafeappzw.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
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
    private static final String APP_URL = "https://gosafezimbabwe.vercel.app";
    private static final String ERROR_PAGE_URL = "file:///android_asset/connection_error.html";
    private static final int MAX_CONNECTION_RETRIES = 5; // try up to 5 times before showing error page (helps slow mobile data)
    private static final int RETRY_DELAY_MS = 5000;     // 5 seconds between retries (gives slow network time to respond)

    /** Retry count for connection errors this session. Reset when app URL loads successfully. */
    private int connectionErrorRetryCount = 0;

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        createNotificationChannel();
        configureWebView();
    }

    private void configureWebView() {}

    @Override
    public void onStart() {
        super.onStart();

        try {
            Bridge bridge = this.getBridge();
            if (bridge != null && bridge.getWebView() != null) {
                WebView webView = bridge.getWebView();

                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        if (url != null && url.startsWith(APP_URL)) {
                            connectionErrorRetryCount = 0;
                            Log.d(TAG, "App loaded successfully - reset retry count");
                        }
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        if (request == null || request.getUrl() == null) return false;
                        String target = request.getUrl().toString();
                        String current = view.getUrl();
                        if (current != null && current.startsWith(ERROR_PAGE_URL)
                                && target.startsWith(APP_URL)) {
                            try {
                                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(target)));
                                Log.d(TAG, "Opened app URL in external browser");
                            } catch (Exception e) {
                                Log.e(TAG, "Open in browser failed: " + e.getMessage());
                            }
                            return true;
                        }
                        return false;
                    }

                    @Override
                    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                        super.onReceivedError(view, request, error);

                        if (request != null && !request.isForMainFrame()) return;

                        String errorCode = String.valueOf(error.getErrorCode());
                        String description = error.getDescription().toString();
                        final String failedUrl = (request != null && request.getUrl() != null)
                                ? request.getUrl().toString() : APP_URL;

                        Log.e(TAG, "WebView Error: " + errorCode + " - " + description + " URL: " + failedUrl);

                        if (!errorCode.contains("ERR_NAME_NOT_RESOLVED")
                                && !errorCode.contains("ERR_CONNECTION_ABORTED")
                                && !errorCode.contains("ERR_INTERNET_DISCONNECTED")
                                && !description.contains("net::ERR")) {
                            return;
                        }

                        connectionErrorRetryCount++;

                        if (connectionErrorRetryCount < MAX_CONNECTION_RETRIES) {
                            Log.w(TAG, "Connection error - retry " + connectionErrorRetryCount + "/" + MAX_CONNECTION_RETRIES + " in " + (RETRY_DELAY_MS/1000) + "s (gives slow network more time)");
                            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                                try {
                                    view.clearCache(true);
                                    view.loadUrl(APP_URL);
                                } catch (Exception e) {
                                    Log.e(TAG, "Retry failed: " + e.getMessage());
                                }
                            }, RETRY_DELAY_MS);
                            return;
                        }

                        Log.w(TAG, "Connection failed after " + MAX_CONNECTION_RETRIES + " attempts - showing error page");
                        connectionErrorRetryCount = 0;

                        try {
                            view.loadUrl(ERROR_PAGE_URL);
                        } catch (Exception e) {
                            Log.e(TAG, "Error loading error page: " + e.getMessage());
                        }

                        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                            try {
                                view.clearCache(true);
                                view.clearFormData();
                                view.clearHistory();
                                view.loadUrl(APP_URL);
                            } catch (Exception e) {
                                Log.e(TAG, "Error clearing cache: " + e.getMessage());
                            }
                        }, 2500);
                    }
                });

                android.webkit.WebSettings settings = webView.getSettings();
                settings.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);

                Log.d(TAG, "WebView error handling configured (retry up to " + MAX_CONNECTION_RETRIES + " times before error page)");
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
