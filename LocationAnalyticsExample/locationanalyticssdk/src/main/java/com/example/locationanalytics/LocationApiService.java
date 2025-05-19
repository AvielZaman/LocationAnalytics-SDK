package com.example.locationanalytics;

import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Query;

public interface LocationApiService {
    @POST("api/location/batch")
    Call<ApiResponse<Void>> sendLocationData(@Body Map<String, Object> requestBody);

    @GET("api/user/statistics")
    Call<ApiResponse<UserStatistics>> getUserStatistics(
            @Query("api_key") String apiKey,
            @Query("user_id") String userId
    );
}