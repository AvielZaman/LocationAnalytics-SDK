package com.example.locationanalytics;

import android.util.Log;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

/**
 * Internal API client for communication with the location analytics server.
 * This class handles all network requests including sending location data
 * and retrieving user statistics.
 *
 * @internal This class is for internal SDK use only
 */
class LocationApiClient {
    private static final String TAG = "LocationApiClient";
    private final LocationApiService apiService;
    private final String apiKey;

    /**
     * Constructor for internal use by the SDK.
     *
     * @param baseUrl The base URL for API requests
     * @param apiKey The API key for authentication
     */
    LocationApiClient(String baseUrl, String apiKey) {
        this.apiKey = apiKey;
        Log.d("SERVER_DEBUG", "LocationApiClient received URL = " + baseUrl);

        Gson gson = new GsonBuilder()
                .setLenient()
                .create();

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(baseUrl)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build();

        apiService = retrofit.create(LocationApiService.class);
    }

    /**
     * Send location data to the server.
     *
     * @param locationDataList List of location data to send
     * @param callback Callback for handling success or error
     */
    void sendLocationData(List<LocationData> locationDataList, final ApiCallback<Void> callback) {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("apiKey", apiKey);
        requestBody.put("locations", locationDataList);

        Log.d(TAG, "Sending " + locationDataList.size() + " locations to server");

        Call<ApiResponse<Void>> call = apiService.sendLocationData(requestBody);
        call.enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    Log.d(TAG, "Successfully sent " + locationDataList.size() + " locations to server");
                    callback.onSuccess(null);
                } else {
                    String errorMsg = response.body() != null ? response.body().getMessage() : "Unknown error";
                    Log.e(TAG, "API Error: " + errorMsg + ". Response code: " + response.code());
                    callback.onError("API Error: " + errorMsg);
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                Log.e(TAG, "API call failed", t);
                callback.onError("Network error: " + t.getMessage());
            }
        });
    }

    /**
     * Get user statistics from the server.
     *
     * @param userId The user ID to get statistics for
     * @param callback Callback for handling the statistics or error
     */
    void getUserStatistics(String userId, final ApiCallback<UserStatistics> callback) {
        Call<ApiResponse<UserStatistics>> call = apiService.getUserStatistics(apiKey, userId);
        call.enqueue(new Callback<ApiResponse<UserStatistics>>() {
            @Override
            public void onResponse(Call<ApiResponse<UserStatistics>> call, Response<ApiResponse<UserStatistics>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    callback.onSuccess(response.body().getData());
                } else {
                    String errorMsg = response.body() != null ? response.body().getMessage() : "Unknown error";
                    Log.e(TAG, "API Error getting statistics: " + errorMsg);
                    callback.onError("API Error: " + errorMsg);
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<UserStatistics>> call, Throwable t) {
                Log.e(TAG, "API call failed", t);
                callback.onError("Network error: " + t.getMessage());
            }
        });
    }
}