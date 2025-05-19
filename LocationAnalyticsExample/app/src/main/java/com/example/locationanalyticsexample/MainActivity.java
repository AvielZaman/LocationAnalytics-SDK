package com.example.locationanalyticsexample;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.LocationManager;
import android.os.Bundle;
import android.provider.Settings;
import android.content.pm.PackageManager;
import android.util.Log;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import com.example.locationanalytics.LocationAnalyticsSDK;
import com.example.locationanalytics.ApiCallback;
import com.example.locationanalytics.UserStatistics;
import com.google.android.material.switchmaterial.SwitchMaterial;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";
    private static final String SERVER_URL = "http://10.100.102.51:3000/";
    private static final String API_KEY = "demo_api_key";
    private String userId;

    // Tracking intervals (in milliseconds)
    private static final int FOREGROUND_INTERVAL = 600000; // 10 minutes
    private static final int BACKGROUND_INTERVAL = 1200000; // 20 minutes

    private LocationAnalyticsSDK sdk;
    private TextView statusText;
    private TextView locationText;
    private TextView statsText;
    private Button startStopButton;
    private Button getCurrentLocationButton;
    private Button getStatsButton;
    private SwitchMaterial backgroundSwitch;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.setContentView(R.layout.activity_main);

        // Generate or retrieve a unique user ID for this installation
        generateOrRetrieveUserId();

        // Initialize UI components
        statusText = findViewById(R.id.status_text);
        locationText = findViewById(R.id.location_text);
        statsText = findViewById(R.id.stats_text);
        startStopButton = findViewById(R.id.start_stop_button);
        getCurrentLocationButton = findViewById(R.id.get_location_button);
        getStatsButton = findViewById(R.id.get_stats_button);
        backgroundSwitch = findViewById(R.id.background_switch);

        // Set up the LocationAnalyticsSDK using the new Builder pattern
        setupSdk();

        // Set up button click listeners
        setupClickListeners();

        // Update UI with current state
        updateStatusText();
    }

    private void generateOrRetrieveUserId() {
        SharedPreferences prefs = getSharedPreferences("LocationAnalyticsPrefs", MODE_PRIVATE);
        userId = prefs.getString("user_id", null);

        if (userId == null) {
            userId = UUID.randomUUID().toString();
            prefs.edit().putString("user_id", userId).apply();
        }

        runOnUiThread(() -> {
            Toast.makeText(this, "User ID: " + userId, Toast.LENGTH_LONG).show();
            Log.d(TAG, "Using User ID: " + userId);
        });
    }

    private void setupSdk() {
        sdk = new LocationAnalyticsSDK.Builder(getApplicationContext())
                .setServerUrl(SERVER_URL)
                .setApiKey(API_KEY)
                .setTrackingInterval(FOREGROUND_INTERVAL)
                .build();

        // Set user identifier
        sdk.setUserIdentifier(userId);
        Log.d(TAG, "SDK initialized with User ID: " + userId);

        // Check if location permissions are granted
        if (!sdk.hasLocationPermission()) {
            Log.d(TAG, "Location permission not granted, requesting...");
            sdk.requestPermissions(this);
        } else {
            Log.d(TAG, "Location permission already granted");
        }

        // Check if GPS is enabled
        checkGpsStatus();
    }

    private void setupClickListeners() {
        // Start/Stop tracking button
        startStopButton.setOnClickListener(v -> {
            if (sdk.isTracking()) {
                Log.d(TAG, "Stopping location tracking");
                sdk.stopTracking();
                Toast.makeText(this, "Location tracking stopped", Toast.LENGTH_SHORT).show();
            } else {
                if (sdk.hasLocationPermission()) {
                    Log.d(TAG, "Starting location tracking with user ID: " + userId);
                    sdk.startTracking();
                    Toast.makeText(this, "Location tracking started", Toast.LENGTH_SHORT).show();
                } else {
                    Log.d(TAG, "Requesting location permissions...");
                    sdk.requestPermissions(this);
                }
            }
            updateStatusText();
        });

        // Get current location button
        getCurrentLocationButton.setOnClickListener(v -> {
            Log.d(TAG, "Get current location button clicked");
            if (sdk.hasLocationPermission()) {
                locationText.setText("Getting current location...");
                sdk.getCurrentLocation(new com.google.android.gms.location.LocationCallback() {
                    @Override
                    public void onLocationResult(@NonNull com.google.android.gms.location.LocationResult locationResult) {
                        if (locationResult.getLastLocation() != null) {
                            String locationInfo = String.format(Locale.getDefault(),
                                    "Current Location:\nLatitude: %.6f\nLongitude: %.6f\nAccuracy: %.1f meters\nTime: %s",
                                    locationResult.getLastLocation().getLatitude(),
                                    locationResult.getLastLocation().getLongitude(),
                                    locationResult.getLastLocation().getAccuracy(),
                                    new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date())
                            );
                            locationText.setText(locationInfo);
                            Log.d(TAG, "Got location: " + locationInfo);
                        } else {
                            locationText.setText("No location found. Check that GPS is enabled.");
                            Log.d(TAG, "No location found");
                        }
                    }
                });
            } else {
                Log.d(TAG, "No location permission, requesting...");
                sdk.requestPermissions(this);
            }
        });

        // Get statistics button
        getStatsButton.setOnClickListener(v -> {
            Log.d(TAG, "Get statistics button clicked for user: " + userId);
            statsText.setText("Getting statistics...");
            sdk.getUserStatistics(new ApiCallback<UserStatistics>() {
                @Override
                public void onSuccess(UserStatistics stats) {
                    Log.d(TAG, "Successfully received statistics");
                    StringBuilder statsInfo = new StringBuilder();
                    statsInfo.append("User Statistics:\n");
                    statsInfo.append("User ID: ").append(userId).append("\n");
                    statsInfo.append("Total Locations: ").append(stats.getTotalLocations()).append("\n");
                    statsInfo.append("Total Distance: ").append(String.format(Locale.getDefault(), "%.2f km", stats.getDistanceTraveledMeters() / 1000)).append("\n");

                    // Add city visits if available
                    Map<String, Integer> cityVisits = stats.getCityVisits();
                    if (cityVisits != null && !cityVisits.isEmpty()) {
                        statsInfo.append("\nCity Visits:\n");
                        for (Map.Entry<String, Integer> entry : cityVisits.entrySet()) {
                            statsInfo.append(entry.getKey()).append(": ").append(entry.getValue()).append(" times\n");
                        }
                    }

                    // Add activity hours if available
                    Map<Integer, Integer> activityHours = stats.getActivityHours();
                    if (activityHours != null && !activityHours.isEmpty()) {
                        statsInfo.append("\nActivity Hours:\n");
                        for (int hour = 0; hour < 24; hour++) {
                            Integer count = activityHours.get(hour);
                            if (count != null && count > 0) {
                                statsInfo.append(String.format(Locale.getDefault(), "%02d:00-%02d:00: %d locations\n",
                                        hour, (hour + 1) % 24, count));
                            }
                        }
                    }

                    statsText.setText(statsInfo.toString());
                }

                @Override
                public void onError(String message) {
                    Log.e(TAG, "Error getting statistics: " + message);
                    statsText.setText("Error getting statistics: " + message);
                }
            });
        });

        // Background tracking switch
        backgroundSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                Log.d(TAG, "Background tracking enabled");
                sdk.setTrackingInterval(BACKGROUND_INTERVAL); // 20 minutes in background
                Toast.makeText(this, "Background tracking enabled (20 min interval)", Toast.LENGTH_SHORT).show();
            } else {
                Log.d(TAG, "Background tracking disabled");
                sdk.setTrackingInterval(FOREGROUND_INTERVAL); // 10 minutes in foreground
                Toast.makeText(this, "Background tracking disabled (10 min interval)", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void updateStatusText() {
        if (sdk.isTracking()) {
            statusText.setText("Status: Location tracking active");
            startStopButton.setText("Stop Tracking");
        } else {
            statusText.setText("Status: Location tracking disabled");
            startStopButton.setText("Start Tracking");
        }
    }

    private void checkGpsStatus() {
        LocationManager locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        boolean isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);

        if (!isGpsEnabled) {
            new AlertDialog.Builder(this)
                    .setTitle("GPS Disabled")
                    .setMessage("GPS is required for accurate location. Would you like to enable GPS?")
                    .setPositiveButton("Settings", (dialog, which) -> {
                        startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
                    })
                    .setNegativeButton("Cancel", null)
                    .show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LocationAnalyticsSDK.LOCATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "Location permission granted");
                Toast.makeText(this, "Location permission granted", Toast.LENGTH_SHORT).show();
                updateStatusText();
            } else {
                Log.e(TAG, "Location permission denied");
                Toast.makeText(this, "Location permission required for app functionality", Toast.LENGTH_LONG).show();
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatusText();

        if (sdk.isTracking() && !backgroundSwitch.isChecked()) {
            sdk.setTrackingInterval(FOREGROUND_INTERVAL);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (sdk.isTracking() && backgroundSwitch.isChecked()) {
            sdk.setTrackingInterval(BACKGROUND_INTERVAL);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Activity being destroyed, forcing sync");
        sdk.forceSync();
    }
}