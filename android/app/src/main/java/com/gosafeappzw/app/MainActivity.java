package com.gosafeappzim.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Create notification channel with custom sound (required for Android 8.0+)
        createNotificationChannel();
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
