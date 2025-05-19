// Server/utils/geoUtils.js

// Haversine formula to calculate distance between two coordinates in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

// Function to find stops (places where user stayed for a while)
const findStops = (locations) => {
    const stops = [];
    const STOP_THRESHOLD_METERS = 150; // Define user as stopped if within 50 meters
    const MIN_STOP_DURATION_MS = 2 * 60 * 1000; // Minimum 10 minutes to qualify as a stop
    
    let currentStopLocations = [];
    
    // Group locations that are close to each other
    for (let i = 0; i < locations.length; i++) {
        const current = locations[i];
        
        if (currentStopLocations.length === 0) {
            currentStopLocations.push(current);
            continue;
        }
        
        const firstInStop = currentStopLocations[0];
        const distance = calculateDistance(
            firstInStop.latitude, firstInStop.longitude,
            current.latitude, current.longitude
        );
        
        if (distance <= STOP_THRESHOLD_METERS) {
            // Still at the same stop
            currentStopLocations.push(current);
        } else {
            // Moved to a new location, check if previous stop is valid
            const duration = currentStopLocations[currentStopLocations.length - 1].timestamp - 
                            currentStopLocations[0].timestamp;
            
            if (duration >= MIN_STOP_DURATION_MS && currentStopLocations.length >= 3) {
                processStopLocation(currentStopLocations, stops, STOP_THRESHOLD_METERS, duration);
            }
            
            // Start a new potential stop
            currentStopLocations = [current];
        }
    }
    
    // Check the last group of locations
    if (currentStopLocations.length >= 3) {
        const duration = currentStopLocations[currentStopLocations.length - 1].timestamp - 
                        currentStopLocations[0].timestamp;
        
        if (duration >= MIN_STOP_DURATION_MS) {
            processStopLocation(currentStopLocations, stops, STOP_THRESHOLD_METERS, duration);
        }
    }
    
    // Sort stops by visit count (most visited first)
    return stops.sort((a, b) => b.visit_count - a.visit_count);
};

// Helper function to process a stop location
const processStopLocation = (locationGroup, stops, threshold, duration) => {
    const avgLat = locationGroup.reduce((sum, loc) => sum + loc.latitude, 0) / 
                  locationGroup.length;
    const avgLng = locationGroup.reduce((sum, loc) => sum + loc.longitude, 0) / 
                  locationGroup.length;
    
    const existingStopIndex = stops.findIndex(stop => 
        calculateDistance(stop.latitude, stop.longitude, avgLat, avgLng) < threshold
    );
    
    if (existingStopIndex >= 0) {
        // Update existing stop
        stops[existingStopIndex].visit_count++;
        stops[existingStopIndex].average_duration_minutes = 
            (stops[existingStopIndex].average_duration_minutes * (stops[existingStopIndex].visit_count - 1) + 
            duration / 60000) / stops[existingStopIndex].visit_count;
    } else {
        // Add new stop
        stops.push({
            latitude: avgLat,
            longitude: avgLng,
            visit_count: 1,
            average_duration_minutes: duration / 60000,
            name: `Stop ${stops.length + 1}` // Would replace with geocoded location name in production
        });
    }
};

module.exports = {
    calculateDistance,
    findStops
};