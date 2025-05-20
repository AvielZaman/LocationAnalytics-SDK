package com.example.locationanalytics;

import androidx.annotation.NonNull;

import com.google.gson.annotations.SerializedName;

public class LocationData {
    @SerializedName("user_id")
    private String userId;

    @SerializedName("latitude")
    private double latitude;

    @SerializedName("longitude")
    private double longitude;

    @SerializedName("timestamp")
    private long timestamp;

    @SerializedName("accuracy")
    private float accuracy;

    @SerializedName("device_info")
    private String deviceInfo;

    public LocationData(String userId, double latitude, double longitude, long timestamp, float accuracy) {
        this.userId = userId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timestamp = timestamp;
        this.accuracy = accuracy;
        this.deviceInfo = android.os.Build.MODEL + " / Android " + android.os.Build.VERSION.RELEASE;
    }

    public String getUserId() {
        return userId;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public float getAccuracy() {
        return accuracy;
    }

    /**
     * Get device information string.
     * @return Device model and Android version
     */
    public String getDeviceInfo() {
        return deviceInfo;
    }

    @NonNull
    @Override
    public String toString() {
        return "LocationData{" +
                "userId='" + userId + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", timestamp=" + timestamp +
                ", accuracy=" + accuracy +
                ", deviceInfo='" + deviceInfo + '\'' +
                '}';
    }
}