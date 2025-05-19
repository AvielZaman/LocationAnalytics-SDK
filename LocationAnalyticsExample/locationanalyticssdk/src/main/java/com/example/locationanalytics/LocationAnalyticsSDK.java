package com.example.locationanalytics;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import java.util.ArrayList;
import java.util.List;

/**
 * Main SDK class for location analytics tracking and management.
 *
 * <p>This SDK provides functionality to track user locations, manage tracking intervals,
 * and retrieve user statistics. It handles location permissions, GPS status, and
 * automatic batching of location data.</p>
 *
 * <p>Example usage:</p>
 * <pre>
 * LocationAnalyticsSDK sdk = new LocationAnalyticsSDK.Builder(context)
 *     .setServerUrl("https://your-server.com/")
 *     .setApiKey("your_api_key")
 *     .setTrackingInterval(600000) // 10 minutes
 *     .build();
 *
 * sdk.setUserIdentifier(userId);
 * sdk.startTracking();
 * </pre>
 */
public class LocationAnalyticsSDK {
    private static final String TAG = "LocationAnalyticsSDK";
    private static LocationAnalyticsSDK instance;
    private final Context context;
    private final LocationApiClient apiClient;
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private LocationRequest locationRequest;
    private List<LocationData> cachedLocations;
    private String userIdentifier;
    private boolean isTrackingActive = false;

    /** Request code for location permissions */
    public static final int LOCATION_PERMISSION_REQUEST_CODE = 1001;

    /** Default tracking interval - 10 minutes */
    private static final int DEFAULT_INTERVAL = 600000;

    /** Default fastest tracking interval - 5 minutes */
    private static final int DEFAULT_FASTEST_INTERVAL = 300000;

    private int trackingInterval = DEFAULT_INTERVAL;
    private int fastestInterval = DEFAULT_FASTEST_INTERVAL;

    private long lastLocationTimestamp = 0;
    private static long MIN_TIME_BETWEEN_UPDATES = 600000;

    /**
     * Private constructor for SDK initialization.
     * Use {@link Builder} or {@link #init(Context, String, String)} to create instances.
     *
     * @param context Application context
     * @param serverUrl Server URL for API calls
     * @param apiKey API key for authentication
     */
    private LocationAnalyticsSDK(Context context, String serverUrl, String apiKey) {
        this.context = context.getApplicationContext();
        this.apiClient = new LocationApiClient(serverUrl, apiKey);
        this.cachedLocations = new ArrayList<>();
        initLocationComponents();
    }

    /**
     * Initialize the SDK singleton instance.
     *
     * @param context Application context
     * @param serverUrl Server URL for API calls (e.g., "https://example.com/")
     * @param apiKey API key for authentication
     * @return The initialized SDK instance
     * @deprecated Since version 2.0. Use {@link Builder} instead for more flexible initialization.
     * This method will be removed in version 3.0.
     */
    @Deprecated
    public static synchronized LocationAnalyticsSDK init(Context context, String serverUrl, String apiKey) {
        if (instance == null) {
            instance = new LocationAnalyticsSDK(context, serverUrl, apiKey);
        }
        Log.d("SERVER_DEBUG", "SDK init received URL = " + serverUrl);
        return instance;
    }

    /**
     * Get the singleton instance of the SDK.
     *
     * @return The SDK instance
     * @throws IllegalStateException if SDK hasn't been initialized
     */
    public static synchronized LocationAnalyticsSDK getInstance() {
        if (instance == null) {
            throw new IllegalStateException("LocationAnalyticsSDK must be initialized with init() method or Builder first");
        }
        return instance;
    }

    /**
     * Builder class for creating LocationAnalyticsSDK instances.
     *
     * <p>Example usage:</p>
     * <pre>
     * LocationAnalyticsSDK sdk = new LocationAnalyticsSDK.Builder(context)
     *     .setServerUrl("https://your-server.com/")
     *     .setApiKey("your_api_key")
     *     .setTrackingInterval(600000)
     *     .build();
     * </pre>
     */
    public static class Builder {
        private Context context;
        private String serverUrl;
        private String apiKey;
        private int trackingInterval = DEFAULT_INTERVAL;
        private int fastestInterval = DEFAULT_FASTEST_INTERVAL;

        /**
         * Create a new Builder instance.
         *
         * @param context Application context
         */
        public Builder(Context context) {
            this.context = context.getApplicationContext();
        }

        /**
         * Set the server URL for API calls.
         *
         * @param serverUrl Complete server URL (e.g., "https://example.com/")
         * @return This builder instance for chaining
         */
        public Builder setServerUrl(String serverUrl) {
            this.serverUrl = serverUrl;
            return this;
        }

        /**
         * Set the API key for authentication.
         *
         * @param apiKey Your API key
         * @return This builder instance for chaining
         */
        public Builder setApiKey(String apiKey) {
            this.apiKey = apiKey;
            return this;
        }

        /**
         * Set the tracking interval for location updates.
         *
         * @param milliseconds Interval in milliseconds (minimum recommended: 300000 for 5 minutes)
         * @return This builder instance for chaining
         */
        public Builder setTrackingInterval(int milliseconds) {
            this.trackingInterval = milliseconds;
            this.fastestInterval = milliseconds / 2;
            return this;
        }

        /**
         * Build and return the LocationAnalyticsSDK instance.
         *
         * @return The configured SDK instance
         * @throws IllegalStateException if serverUrl or apiKey is not set
         */
        public LocationAnalyticsSDK build() {
            if (serverUrl == null || apiKey == null) {
                throw new IllegalStateException("ServerUrl and ApiKey must be set");
            }

            LocationAnalyticsSDK sdk = new LocationAnalyticsSDK(context, serverUrl, apiKey);
            sdk.setTrackingInterval(trackingInterval);

            // Set as singleton instance
            instance = sdk;

            return sdk;
        }
    }

    private void initLocationComponents() {
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(context);

        locationRequest = new LocationRequest.Builder(trackingInterval)
                .setPriority(Priority.PRIORITY_BALANCED_POWER_ACCURACY)
                .setMinUpdateIntervalMillis(fastestInterval)
                .setMaxUpdateDelayMillis(trackingInterval + 60000)
                .setWaitForAccurateLocation(false)
                .build();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(@NonNull LocationResult locationResult) {
                if (locationResult.getLocations().size() > 0) {
                    Location location = locationResult.getLocations().get(0);

                    long currentTime = System.currentTimeMillis();
                    if (currentTime - lastLocationTimestamp >= MIN_TIME_BETWEEN_UPDATES) {
                        processLocation(location);
                        lastLocationTimestamp = currentTime;
                        Log.d(TAG, "Location recorded at interval: " + (currentTime - lastLocationTimestamp) + "ms");
                    } else {
                        Log.d(TAG, "Skipping location update - not enough time elapsed");
                    }
                }
            }
        };
    }

    /**
     * Set the user identifier for location tracking.
     * This should be called before starting location tracking.
     *
     * @param userIdentifier Unique identifier for the user (e.g., UUID, user ID)
     */
    public void setUserIdentifier(String userIdentifier) {
        this.userIdentifier = userIdentifier;
        Log.d(TAG, "User identifier set: " + userIdentifier);
    }

    /**
     * Set the tracking interval for location updates.
     * This affects battery usage - longer intervals consume less battery.
     *
     * @param milliseconds Interval in milliseconds (minimum recommended: 300000 for 5 minutes)
     */
    public void setTrackingInterval(int milliseconds) {
        this.trackingInterval = milliseconds;
        this.fastestInterval = milliseconds / 2;
        MIN_TIME_BETWEEN_UPDATES = milliseconds;

        locationRequest = new LocationRequest.Builder(trackingInterval)
                .setPriority(Priority.PRIORITY_BALANCED_POWER_ACCURACY)
                .setMinUpdateIntervalMillis(fastestInterval)
                .setMaxUpdateDelayMillis(trackingInterval + 60000)
                .setWaitForAccurateLocation(false)
                .build();

        if (isTrackingActive) {
            stopTracking();
            startTracking();
        }

        Log.d(TAG, "Tracking interval set to: " + milliseconds + "ms");
    }

    /**
     * Request location permissions from the user.
     * This will show the system permission dialog.
     *
     * @param activity The activity context for showing the permission dialog
     */
    public void requestPermissions(Activity activity) {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(activity,
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION},
                    LOCATION_PERMISSION_REQUEST_CODE);
        }
    }

    /**
     * Check if the app has location permission.
     *
     * @return true if permission is granted, false otherwise
     */
    public boolean hasLocationPermission() {
        return ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * Start location tracking.
     * Requires location permission to be granted.
     * Call {@link #setUserIdentifier(String)} before starting tracking.
     *
     * @throws SecurityException if location permission is not granted
     */
    public void startTracking() {
        if (!hasLocationPermission()) {
            Log.e(TAG, "Cannot start tracking: Location permission not granted");
            return;
        }

        try {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper());
            isTrackingActive = true;
            Log.d(TAG, "Location tracking started with interval: " + trackingInterval + "ms");
        } catch (SecurityException e) {
            Log.e(TAG, "Error starting location tracking", e);
        }
    }

    /**
     * Stop location tracking.
     * This will also send any cached locations to the server.
     */
    public void stopTracking() {
        fusedLocationClient.removeLocationUpdates(locationCallback);
        isTrackingActive = false;
        Log.d(TAG, "Location tracking stopped");

        if (!cachedLocations.isEmpty()) {
            sendCachedLocations();
        }
    }

    /**
     * Check if location tracking is currently active.
     *
     * @return true if tracking is active, false otherwise
     */
    public boolean isTracking() {
        return isTrackingActive;
    }

    /**
     * Get the current location immediately.
     * This does not affect regular tracking intervals.
     *
     * @param callback Callback to receive the location result
     */
    public void getCurrentLocation(final LocationCallback callback) {
        if (!hasLocationPermission()) {
            Log.e(TAG, "Cannot get current location: Location permission not granted");
            return;
        }

        try {
            fusedLocationClient.getLastLocation()
                    .addOnSuccessListener(location -> {
                        callback.onLocationResult(LocationResult.create(location != null ?
                                java.util.Collections.singletonList(location) :
                                new ArrayList<>()));
                    })
                    .addOnFailureListener(e ->
                            Log.e(TAG, "Error getting current location", e));
        } catch (SecurityException e) {
            Log.e(TAG, "Error getting current location", e);
        }
    }

    /**
     * Force synchronization of cached location data to the server.
     * This is automatically called when stopping tracking or when the app is destroyed.
     */
    public void forceSync() {
        sendCachedLocations();
    }

    /**
     * Get user statistics from the server.
     *
     * @param callback Callback to receive the statistics or error
     * @return The user identifier being queried, or null if not set
     */
    public String getUserStatistics(final ApiCallback<UserStatistics> callback) {
        if (userIdentifier == null || userIdentifier.isEmpty()) {
            callback.onError("User identifier not set");
            return null;
        }

        apiClient.getUserStatistics(userIdentifier, callback);
        return userIdentifier;
    }

    private void processLocation(Location location) {
        if (location == null) return;

        LocationData locationData = new LocationData(
                userIdentifier,
                location.getLatitude(),
                location.getLongitude(),
                System.currentTimeMillis(),
                location.getAccuracy()
        );

        Log.d(TAG, "Location recorded: " + locationData);
        cachedLocations.add(locationData);
        sendCachedLocations();
    }

    private void sendCachedLocations() {
        if (cachedLocations.isEmpty()) return;

        final List<LocationData> locationsToSend = new ArrayList<>(cachedLocations);
        Log.d(TAG, "Attempting to send " + locationsToSend.size() + " locations to server");

        cachedLocations.clear();

        apiClient.sendLocationData(locationsToSend, new ApiCallback<Void>() {
            @Override
            public void onSuccess(Void result) {
                Log.d(TAG, "Successfully sent " + locationsToSend.size() + " locations to server");
            }

            @Override
            public void onError(String message) {
                Log.e(TAG, "Failed to send locations: " + message);
                cachedLocations.addAll(locationsToSend);

                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    Log.d(TAG, "Retrying location send...");
                    sendCachedLocations();
                }, 30000);
            }
        });
    }
}