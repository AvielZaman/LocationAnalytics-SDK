# Location Analytics SDK Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Android SDK Integration](#android-sdk-integration)
   - [Installation](#installation)
   - [Initialization](#initialization)
   - [User Identification](#user-identification)
   - [Permissions Management](#permissions-management)
   - [Location Tracking](#location-tracking)
   - [Retrieving Statistics](#retrieving-statistics)
   - [Background Tracking](#background-tracking)
   - [Best Practices](#best-practices)
3. [API Reference](#api-reference)
   - [Authentication](#authentication)
   - [Endpoints](#endpoints)
   - [Data Models](#data-models)
   - [Error Handling](#error-handling)
4. [Dashboard Guide](#dashboard-guide)
   - [Overview](#overview)
   - [Heatmap View](#heatmap-view)
   - [Path View](#path-view)
   - [Stops View](#stops-view)
   - [Statistics](#statistics)
   - [Filtering Data](#filtering-data)
5. [Server Deployment](#server-deployment)
   - [Local Development](#local-development)
   - [Cloud Deployment](#cloud-deployment)
   - [Environment Variables](#environment-variables)
   - [Database Setup](#database-setup)
6. [Troubleshooting](#troubleshooting)
   - [Android SDK Issues](#android-sdk-issues)
   - [Server Issues](#server-issues)
   - [Dashboard Issues](#dashboard-issues)
7. [Release Notes](#release-notes)

## Introduction

The Location Analytics SDK provides a comprehensive solution for tracking and analyzing user movement patterns in Android applications. With this SDK, developers can:

- Track user locations with customizable intervals
- Collect location data in both foreground and background modes
- Visualize user movement with heatmaps, path tracking, and stop detection
- Analyze movement patterns with statistical tools
- Gain insights into user behavior through the analytics dashboard

The system consists of three main components:

1. **Android SDK**: A library that Android developers integrate into their apps
2. **Backend API**: A Node.js/Express server that processes and stores location data
3. **Analytics Dashboard**: A web interface for visualizing and analyzing the collected data

This documentation provides comprehensive guidance on integrating, configuring, and using all components of the Location Analytics system.

## Android SDK Integration

### Installation

#### 1. Add the SDK Module

Copy the `locationanalyticssdk` directory into your project's root directory.

#### 2. Update Gradle Files

In your project's `settings.gradle`:

```gradle
include ':app', ':locationanalyticssdk'
```

In your app's `build.gradle`:

```gradle
dependencies {
    implementation project(':locationanalyticssdk')
    // Other dependencies
}
```

#### 3. Update AndroidManifest.xml

Add the required permissions to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

For background tracking on Android 10+ (API level 29+), you'll also need:

```xml
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

#### 4. Sync Project with Gradle

Run the "Sync Project with Gradle Files" option in Android Studio.

### Initialization

Initialize the SDK in your Application class or main Activity using the Builder pattern:

```java
// Initialize with the Builder pattern (recommended)
LocationAnalyticsSDK sdk = new LocationAnalyticsSDK.Builder(getApplicationContext())
    .setServerUrl("https://your-server-url.com/")
    .setApiKey("your_api_key")
    .setTrackingInterval(600000) // 10 minutes
    .build();
```

### User Identification

Set a unique identifier for the user to group their location data:

```java
sdk.setUserIdentifier("unique_user_id");
```

For first-time users, you can generate a random UUID:

```java
String userId = UUID.randomUUID().toString();
sdk.setUserIdentifier(userId);

// Save this ID for future app sessions
SharedPreferences prefs = getSharedPreferences("LocationAnalyticsPrefs", MODE_PRIVATE);
prefs.edit().putString("user_id", userId).apply();
```

### Permissions Management

#### 1. Check Permissions

```java
boolean hasPermission = sdk.hasLocationPermission();
```

#### 2. Request Permissions

```java
if (!sdk.hasLocationPermission()) {
    sdk.requestPermissions(this); // 'this' should be an Activity
}
```

#### 3. Handle Permission Results

```java
@Override
public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode == LocationAnalyticsSDK.LOCATION_PERMISSION_REQUEST_CODE) {
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            // Permission granted, can start tracking now
            sdk.startTracking();
        }
    }
}
```

### Location Tracking

#### 1. Start Tracking

```java
// Start automatic location tracking
sdk.startTracking();
```

#### 2. Stop Tracking

```java
// Stop automatic location tracking
sdk.stopTracking();
```

#### 3. Check If Tracking is Active

```java
boolean isTracking = sdk.isTracking();
```

#### 4. Get Current Location Once

```java
sdk.getCurrentLocation(new LocationCallback() {
    @Override
    public void onLocationResult(@NonNull LocationResult locationResult) {
        if (locationResult.getLastLocation() != null) {
            Location location = locationResult.getLastLocation();
            double latitude = location.getLatitude();
            double longitude = location.getLongitude();
            float accuracy = location.getAccuracy();
            
            // Use location data
        }
    }
});
```

#### 5. Force Sync Cached Locations

```java
// Send any cached locations to the server
sdk.forceSync();
```

### Retrieving Statistics

Fetch user statistics from the server:

```java
sdk.getUserStatistics(new ApiCallback<UserStatistics>() {
    @Override
    public void onSuccess(UserStatistics stats) {
        // Access statistics
        int totalLocations = stats.getTotalLocations();
        double distanceKm = stats.getDistanceTraveledMeters() / 1000.0;
        Map<String, Integer> cityVisits = stats.getCityVisits();
        
        // Update UI with statistics
        updateStatsUI(stats);
    }

    @Override
    public void onError(String message) {
        // Handle error
        showErrorMessage("Failed to fetch statistics: " + message);
    }
});
```

### Background Tracking

#### 1. Set a Different Interval for Background

```java
// Set a longer interval for background mode to save battery
sdk.setTrackingInterval(20 * 60 * 1000); // 20 minutes
```

#### 2. Implement in Activity Lifecycle

```java
@Override
protected void onResume() {
    super.onResume();
    // Use shorter interval when app is in foreground
    sdk.setTrackingInterval(10 * 60 * 1000); // 10 minutes
}

@Override
protected void onPause() {
    super.onPause();
    // Use longer interval when app is in background
    sdk.setTrackingInterval(20 * 60 * 1000); // 20 minutes
}

@Override
protected void onDestroy() {
    super.onDestroy();
    // Ensure all pending locations are sent
    sdk.forceSync();
}
```

### Best Practices

#### Battery Optimization

1. **Use appropriate tracking intervals**:
   - 10+ minutes for most applications
   - 5 minutes for transportation/navigation apps
   - 15-30 minutes for social/check-in apps

2. **Adjust for foreground/background**:
   - Use shorter intervals when app is active
   - Use longer intervals when app is in background

3. **Balance accuracy and battery usage**:
   - Use `Priority.PRIORITY_BALANCED_POWER_ACCURACY` for most cases
   - Only use `Priority.PRIORITY_HIGH_ACCURACY` when needed

#### Data Efficiency

1. **Batch uploads**:
   - The SDK automatically batches location data
   - Call `forceSync()` only when necessary

2. **Handle connectivity issues**:
   - The SDK caches locations when offline
   - Locations are sent when connectivity is restored

#### User Privacy

1. **Clear permission requests**:
   - Explain why location tracking is needed
   - Provide value proposition for location sharing

2. **Transparency**:
   - Let users know what data is collected
   - Allow users to opt out of tracking

3. **Data security**:
   - Use secure API keys
   - Don't store sensitive information with location data

## API Reference

### Authentication

All API requests require an API key for authentication:

#### Query Parameter Authentication
```
GET /api/users?api_key=your_api_key
```

#### Body Parameter Authentication (for POST requests)
```json
{
  "apiKey": "your_api_key",
  "locations": [...]
}
```

### Endpoints

#### 1. Batch Location Upload

Sends multiple location data points in one request.

- **URL**: `/api/location/batch`
- **Method**: `POST`
- **Authentication**: API key in request body
- **Request Body**:
```json
{
  "apiKey": "your_api_key",
  "locations": [
    {
      "user_id": "user123",
      "latitude": 32.0853,
      "longitude": 34.7818,
      "timestamp": 1621504412000,
      "accuracy": 10.5,
      "device_info": "Pixel 4 / Android 11"
    },
    {
      "user_id": "user123",
      "latitude": 32.0855,
      "longitude": 34.7820,
      "timestamp": 1621504512000,
      "accuracy": 8.2,
      "device_info": "Pixel 4 / Android 11"
    }
  ]
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Saved 6 locations (including duplicates for heatmap)"
}
```
- **Error Response**:
```json
{
  "success": false,
  "message": "Error message"
}
```

#### 2. Get Locations

Retrieves locations for a specific user and time range.

- **URL**: `/api/locations`
- **Method**: `GET`
- **Authentication**: API key as query parameter
- **Query Parameters**:
  - `api_key` (required): Your API key
  - `user_id` (optional): Specific user ID (if omitted, returns locations for all users)
  - `start_time` (optional): Start timestamp in milliseconds (default: 0)
  - `end_time` (optional): End timestamp in milliseconds (default: current time)
  - `limit` (optional): Maximum number of locations to return (default: 1000)
- **Success Response**:
```json
{
  "success": true,
  "message": "Found 42 locations",
  "data": [
    {
      "user_id": "user123",
      "latitude": 32.0853,
      "longitude": 34.7818,
      "timestamp": 1621504412000,
      "accuracy": 10.5,
      "device_info": "Pixel 4 / Android 11"
    },
    ...
  ]
}
```

#### 3. Get Users

Retrieves all users in the system.

- **URL**: `/api/users`
- **Method**: `GET`
- **Authentication**: API key as query parameter
- **Query Parameters**:
  - `api_key` (required): Your API key
- **Success Response**:
```json
{
  "success": true,
  "message": "Found 5 users",
  "data": [
    {
      "user_id": "user123",
      "first_seen": 1621504412000,
      "last_seen": 1621590812000,
      "total_locations": 156
    },
    ...
  ]
}
```

#### 4. Get User Statistics

Retrieves statistics for a specific user.

- **URL**: `/api/user/statistics`
- **Method**: `GET`
- **Authentication**: API key as query parameter
- **Query Parameters**:
  - `api_key` (required): Your API key
  - `user_id` (required): The user ID to get statistics for
- **Success Response**:
```json
{
  "success": true,
  "message": "Statistics calculated",
  "data": {
    "user_id": "user123",
    "total_locations": 156,
    "distance_traveled_meters": 12345.67,
    "first_location_timestamp": 1621504412000,
    "last_location_timestamp": 1621590812000,
    "city_visits": {
      "Tel Aviv": 42,
      "Jerusalem": 15,
      "Haifa": 8
    },
    "common_stops": [
      {
        "latitude": 32.0853,
        "longitude": 34.7818,
        "visit_count": 12,
        "average_duration_minutes": 45.5,
        "name": "Tel Aviv"
      },
      ...
    ],
    "activity_hours": {
      "8": 15,
      "9": 22,
      "10": 18,
      ...
    }
  }
}
```

### Data Models

#### 1. Location Data

```json
{
  "user_id": "string",
  "latitude": "number",
  "longitude": "number",
  "timestamp": "number",
  "accuracy": "number",
  "device_info": "string"
}
```

#### 2. User

```json
{
  "user_id": "string",
  "first_seen": "number",
  "last_seen": "number",
  "total_locations": "number"
}
```

#### 3. User Statistics

```json
{
  "user_id": "string",
  "total_locations": "number",
  "distance_traveled_meters": "number",
  "first_location_timestamp": "number",
  "last_location_timestamp": "number",
  "city_visits": {
    "city_name": "number"
  },
  "common_stops": [
    {
      "latitude": "number",
      "longitude": "number",
      "visit_count": "number",
      "average_duration_minutes": "number",
      "name": "string"
    }
  ],
  "activity_hours": {
    "hour": "number"
  }
}
```

### Error Handling

All API endpoints return a consistent error response format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common error scenarios:

- **Invalid API Key**: 401 Unauthorized
- **Missing Required Parameters**: 400 Bad Request
- **User Not Found**: 404 Not Found
- **Server Error**: 500 Internal Server Error

## Dashboard Guide

### Overview

The Analytics Dashboard provides visual insights into location data. It includes:

- Statistics overview
- Heatmap visualization
- Path tracking
- Common stops analysis
- Activity hour distribution
- City visit frequency

### Heatmap View

The heatmap shows the density of user visits across the map:

1. Select a user from the dropdown
2. Set the date range
3. Click "Heat Map" button
4. Areas with higher visit frequency appear in red/orange
5. Areas with lower visit frequency appear in blue/green

### Path View

The path view shows the movement patterns of a user:

1. Select a user from the dropdown (not available for "All Users")
2. Set the date range
3. Click "Path" button
4. Lines connect consecutive location points
5. Start and end points are marked with dots

### Stops View

The stops view identifies locations where users spent significant time:

1. Select a user from the dropdown
2. Set the date range
3. Click "Stops" button
4. Stops are visualized as circles, with size indicating visit frequency
5. Click on a stop to see details (visit count and average duration)

### Statistics

The dashboard provides several statistical visualizations:

1. **Activity Hours**: Shows when users are most active throughout the day
2. **Visits by Area**: Pie chart showing the distribution of visits by city/area
3. **Common Stops**: List of frequently visited locations
4. **Activity Timeline**: Line chart showing activity levels by date

### Filtering Data

Filter the data to focus on specific users or time periods:

1. **User Selection**: Use the dropdown at the top to select a specific user
2. **Date Range**: Set the start and end dates to filter the time period
3. **Refresh**: Click the refresh button to update all visualizations

## Server Deployment

### Local Development

1. Clone the repository
2. Install dependencies:
   ```
   cd Server
   npm install
   ```
3. Create a `.env` file with:
   ```
   PORT=your_port
   MONGODB_URI=your_mongodb_connection_string
   API_KEY=your_api_key
   SERVER_URL=your_server_url
   ```
4. Start the server:
   ```
   npm start
   ```

### Cloud Deployment

#### Deploying to Render

1. Push your code to a GitHub repository
2. Sign up for a Render account
3. Create a new Web Service
4. Connect to your GitHub repository
5. Set the build command: `cd Server && npm install`
6. Set the start command: `cd Server && npm start`
7. Add environment variables in the Render dashboard
8. Deploy the service

#### Deploying to Heroku

1. Push your code to a GitHub repository
2. Sign up for a Heroku account
3. Create a new app
4. Connect to your GitHub repository
5. Add a `Procfile` in the root directory with:
   ```
   web: cd Server && npm start
   ```
6. Add environment variables in the Heroku dashboard
7. Deploy the application

### Environment Variables

- `PORT`: The port for the server to listen on
- `MONGODB_URI`: MongoDB connection string
- `API_KEY`: API key for authentication
- `SERVER_URL`: URL of the deployed server (for self-pinging to prevent inactivity)

### Database Setup

#### MongoDB Atlas Setup

1. Sign up for a MongoDB Atlas account
2. Create a new cluster
3. Set up database access (username and password)
4. Set up network access (IP whitelist)
5. Get your connection string:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/LocationSDK?retryWrites=true&w=majority
   ```
6. Update your `.env` file with the connection string

## Troubleshooting

### Android SDK Issues

#### No locations being tracked

- Ensure permissions are granted
- Check if GPS is enabled
- Verify that tracking has been started with `sdk.startTracking()`
- Check if the device has connectivity
- Verify that the server URL is correct

#### Locations not appearing in dashboard

- Check that API key and server URL are correctly set
- Verify that locations are being sent to the server
- Check server logs for any errors
- Ensure that the user ID is consistent

#### Battery drain

- Increase tracking interval to reduce battery usage
- Use `PRIORITY_BALANCED_POWER_ACCURACY` instead of `PRIORITY_HIGH_ACCURACY`
- Adjust the interval for background mode to be longer

### Server Issues

#### MongoDB connection issues

- Verify your connection string in the `.env` file
- Check that your IP is whitelisted in MongoDB Atlas
- Ensure username and password are correct

#### API key errors

- Confirm the API key is correctly set in both server and app
- Check that the API key is being sent in API requests

#### Server becoming inactive

- Ensure the `SERVER_URL` environment variable is correctly set
- The server pings itself every 5 minutes to prevent inactivity
- Check if your hosting provider requires additional configuration

### Dashboard Issues

#### Map not displaying

- Ensure Leaflet.js is loaded
- Check browser console for any errors
- Verify that the map container has a defined height
- Check if there are any CORS issues

#### No data shown

- Verify that there is data for the selected user and date range
- Check browser console for any errors
- Ensure API connectivity
- Try refreshing the data

## Release Notes

### Version 1.0.0 (May 2025)

- Initial release
- Android SDK with location tracking and statistics
- Backend API with MongoDB integration
- Analytics Dashboard with heatmap, path, and stops visualization
