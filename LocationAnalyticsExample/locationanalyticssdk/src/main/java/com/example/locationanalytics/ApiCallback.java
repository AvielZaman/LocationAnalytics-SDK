package com.example.locationanalytics;

/**
 * Callback interface for API responses.
 * Used for asynchronous operations in the LocationAnalyticsSDK.
 *
 * @param <T> The type of data expected in the response
 */
public interface ApiCallback<T> {
    /**
     * Called when the API request is successful.
     *
     * @param result The result data from the API
     */
    void onSuccess(T result);

    /**
     * Called when the API request fails.
     *
     * @param message Error message describing the failure
     */
    void onError(String message);
}