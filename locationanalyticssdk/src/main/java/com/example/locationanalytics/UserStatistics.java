package com.example.locationanalytics;

import com.google.gson.annotations.SerializedName;

import java.util.List;
import java.util.Map;

/**
 * User statistics data model containing analytics information about a user's location history.
 * This class is populated from server responses and provides various metrics about user movement.
 */
public class UserStatistics {
    @SerializedName("user_id")
    private String userId;

    @SerializedName("total_locations")
    private int totalLocations;

    @SerializedName("distance_traveled_meters")
    private double distanceTraveledMeters;

    @SerializedName("first_location_timestamp")
    private long firstLocationTimestamp;

    @SerializedName("last_location_timestamp")
    private long lastLocationTimestamp;

    @SerializedName("city_visits")
    private Map<String, Integer> cityVisits;

    @SerializedName("common_stops")
    private List<LocationStop> commonStops;

    @SerializedName("activity_hours")
    private Map<Integer, Integer> activityHours;

    /**
     * Represents a frequently visited location/stop.
     */
    public static class LocationStop {
        @SerializedName("latitude")
        private double latitude;

        @SerializedName("longitude")
        private double longitude;

        @SerializedName("visit_count")
        private int visitCount;

        @SerializedName("average_duration_minutes")
        private double averageDurationMinutes;

        @SerializedName("name")
        private String name;

        /**
         * Get the latitude of this stop.
         * @return Latitude coordinate
         */
        public double getLatitude() {
            return latitude;
        }

        /**
         * Get the longitude of this stop.
         * @return Longitude coordinate
         */
        public double getLongitude() {
            return longitude;
        }

        /**
         * Get the number of times this location was visited.
         * @return Visit count
         */
        public int getVisitCount() {
            return visitCount;
        }

        /**
         * Get the average duration spent at this location.
         * @return Average duration in minutes
         */
        public double getAverageDurationMinutes() {
            return averageDurationMinutes;
        }

        /**
         * Get the name/description of this location.
         * @return Location name or null if not available
         */
        public String getName() {
            return name;
        }
    }

    /**
     * Get the user ID these statistics belong to.
     * @return User identifier
     */
    public String getUserId() {
        return userId;
    }

    /**
     * Get the total number of location points recorded.
     * @return Total location count
     */
    public int getTotalLocations() {
        return totalLocations;
    }

    /**
     * Get the total distance traveled by the user.
     * @return Distance in meters
     */
    public double getDistanceTraveledMeters() {
        return distanceTraveledMeters;
    }

    /**
     * Get the timestamp of the first recorded location.
     * @return Timestamp in milliseconds
     */
    public long getFirstLocationTimestamp() {
        return firstLocationTimestamp;
    }

    /**
     * Get the timestamp of the last recorded location.
     * @return Timestamp in milliseconds
     */
    public long getLastLocationTimestamp() {
        return lastLocationTimestamp;
    }

    /**
     * Get a map of cities visited with visit counts.
     * @return Map where key is city name and value is visit count
     */
    public Map<String, Integer> getCityVisits() {
        return cityVisits;
    }

    /**
     * Get a list of frequently visited locations/stops.
     * @return List of common stops
     */
    public List<LocationStop> getCommonStops() {
        return commonStops;
    }

    /**
     * Get activity distribution by hour of day.
     * @return Map where key is hour (0-23) and value is activity count
     */
    public Map<Integer, Integer> getActivityHours() {
        return activityHours;
    }
}