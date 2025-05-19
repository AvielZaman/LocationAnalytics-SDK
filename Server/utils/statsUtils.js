// Server/utils/statsUtils.js
const { calculateDistance, findStops } = require('./geoUtils');

// Calculate user statistics from location data
const calculateUserStatistics = async (userId, locations) => {
    if (!locations || locations.length === 0) {
        return {
            user_id: userId,
            total_locations: 0,
            distance_traveled_meters: 0,
            first_location_timestamp: null,
            last_location_timestamp: null,
            city_visits: {},
            common_stops: [],
            activity_hours: {}
        };
    }
    
    // Get unique locations (filter out duplicates created for heatmap)
    // Group by timestamp and keep only one location per timestamp
    const timestampMap = new Map();
    
    for (const location of locations) {
        const key = `${location.timestamp}`;
        if (!timestampMap.has(key)) {
            timestampMap.set(key, location);
        }
    }
    
    const uniqueLocations = Array.from(timestampMap.values())
        .sort((a, b) => a.timestamp - b.timestamp);
    
    // Initialize statistics
    const statistics = {
        user_id: userId,
        total_locations: uniqueLocations.length,
        distance_traveled_meters: 0,
        first_location_timestamp: uniqueLocations[0].timestamp,
        last_location_timestamp: uniqueLocations[uniqueLocations.length - 1].timestamp,
        city_visits: {}, // Will require geocoding API to implement fully
        common_stops: [],
        activity_hours: {}
    };
    
    // Calculate distance traveled
    for (let i = 1; i < uniqueLocations.length; i++) {
        const prevLoc = uniqueLocations[i - 1];
        const currentLoc = uniqueLocations[i];
        
        const distance = calculateDistance(
            prevLoc.latitude, prevLoc.longitude,
            currentLoc.latitude, currentLoc.longitude
        );
        
        statistics.distance_traveled_meters += distance;
    }
    
    // Calculate activity hours
    for (const location of uniqueLocations) {
        const hour = new Date(location.timestamp).getHours();
        statistics.activity_hours[hour] = (statistics.activity_hours[hour] || 0) + 1;
    }
    
    // Identify common stops (places where user stays for some time)
    const stops = findStops(uniqueLocations);
    statistics.common_stops = stops.slice(0, 10); // Top 10 stops
    
    return statistics;
};

module.exports = {
    calculateUserStatistics
};