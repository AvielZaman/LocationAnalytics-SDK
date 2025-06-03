// Dashboard/modules/geoUtils.js

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

// Deduplicate locations by timestamp
const deduplicateLocations = (locations) => {
    const uniqueLocations = [];
    const seenTimestamps = new Map();
    
    for (const location of locations) {
        const key = `${location.user_id}_${location.timestamp}`;
        if (!seenTimestamps.has(key)) {
            seenTimestamps.set(key, true);
            uniqueLocations.push(location);
        }
    }
    
    return uniqueLocations;
};

// FIXED: More lenient stop detection for all users
const findStops = (locations, stopThresholdMeters = 500, minStopDurationMs = 2 * 60 * 1000, maxStops = 20) => {
    if (!locations || locations.length < 3) return [];
    
    // Deduplicate locations first
    const uniqueLocations = deduplicateLocations(locations);
    
    // Sort by timestamp
    const sortedLocations = uniqueLocations.sort((a, b) => a.timestamp - b.timestamp);
    
    const stops = [];
    let currentStopLocations = [];
    
    for (let i = 0; i < sortedLocations.length; i++) {
        const location = sortedLocations[i];
        
        if (currentStopLocations.length === 0) {
            currentStopLocations.push(location);
            continue;
        }
        
        const firstInStop = currentStopLocations[0];
        const distance = calculateDistance(
            firstInStop.latitude, firstInStop.longitude,
            location.latitude, location.longitude
        );
        
        if (distance <= stopThresholdMeters) {
            // Still at the same stop
            currentStopLocations.push(location);
        } else {
            // Check if previous locations form a valid stop
            if (currentStopLocations.length >= 2) { // Reduced from 3
                const duration = currentStopLocations[currentStopLocations.length - 1].timestamp - 
                                 currentStopLocations[0].timestamp;
                
                if (duration >= minStopDurationMs) {
                    processStopLocation(currentStopLocations, stops, stopThresholdMeters, duration);
                }
            }
            
            currentStopLocations = [location];
        }
    }
    
    // Check the last group of locations
    if (currentStopLocations.length >= 2) {
        const duration = currentStopLocations[currentStopLocations.length - 1].timestamp - 
                         currentStopLocations[0].timestamp;
        
        if (duration >= minStopDurationMs) {
            processStopLocation(currentStopLocations, stops, stopThresholdMeters, duration);
        }
    }
    
    // Sort by visit count and take top stops
    return stops
        .sort((a, b) => b.visit_count - a.visit_count)
        .slice(0, maxStops);
};

// Helper function to process a stop location - improved clustering
const processStopLocation = (locationGroup, stops, threshold, duration) => {
    const avgLat = locationGroup.reduce((sum, loc) => sum + loc.latitude, 0) / 
                  locationGroup.length;
    const avgLng = locationGroup.reduce((sum, loc) => sum + loc.longitude, 0) / 
                  locationGroup.length;
    
    // Use comprehensive area mapping
    const stopName = mapCoordinatesToClusterName(avgLat, avgLng);
    
    // Check if this stop is close to an existing one with larger threshold
    let foundExistingStop = false;
    const clusterThreshold = 800; // Increased clustering threshold
    
    for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const stopDistance = calculateDistance(
            avgLat, avgLng, stop.latitude, stop.longitude
        );
        
        if (stopDistance <= clusterThreshold) {
            // Update existing stop
            stop.visit_count++;
            stop.average_duration_minutes = 
                (stop.average_duration_minutes * (stop.visit_count - 1) + duration / 60000) / 
                stop.visit_count;
            foundExistingStop = true;
            break;
        }
    }
    
    if (!foundExistingStop) {
        // Add new stop
        stops.push({
            latitude: avgLat,
            longitude: avgLng,
            visit_count: 1,
            average_duration_minutes: duration / 60000,
            name: stopName,
            user_id: locationGroup[0].user_id
        });
    }
};

// SYSTEMATIC FIX: Proper ordering and generous radii for all cities
const getAllIsraeliClusters = () => {
    return [
        // SMALL CITIES FIRST (most specific) - prevents capture by larger cities
        { name: "Caesarea", center: [32.5016, 34.8933], radius: 4000 },
        { name: "Herzliya", center: [32.1624, 34.8441], radius: 5000 },
        { name: "Ramat Gan", center: [32.0823, 34.8140], radius: 4000 },
        { name: "Bnei Brak", center: [32.0808, 34.8338], radius: 3500 },
        { name: "Holon", center: [32.0167, 34.7667], radius: 4000 },
        { name: "Petah Tikva", center: [32.0878, 34.8878], radius: 5000 },
        { name: "Maaleh Adumim", center: [31.7730, 35.2954], radius: 4000 },
        { name: "Metula", center: [33.2824, 35.5691], radius: 3000 },
        { name: "Ein Gedi", center: [31.4619, 35.3888], radius: 4000 },
        { name: "Sderot", center: [31.5240, 34.5965], radius: 4000 },
        { name: "Umm al-Fahm", center: [32.5189, 35.1522], radius: 4000 },
        
        // MEDIUM CITIES
        { name: "Netanya", center: [32.3226, 34.8533], radius: 6000 },
        { name: "Hadera", center: [32.4341, 34.9191], radius: 5000 },
        { name: "Nahariya", center: [33.0073, 35.0950], radius: 5000 },
        { name: "Acre", center: [32.9234, 35.0818], radius: 5000 },
        { name: "Ashkelon", center: [31.6688, 34.5742], radius: 7000 },
        { name: "Ashdod", center: [31.8040, 34.6550], radius: 8000 },
        { name: "Kiryat Gat", center: [31.6100, 34.7642], radius: 5000 },
        { name: "Bethlehem", center: [31.7054, 35.2024], radius: 5000 },
        { name: "Ramallah", center: [31.8996, 35.2042], radius: 6000 },
        { name: "Hebron", center: [31.5326, 35.0998], radius: 6000 },
        { name: "Kiryat Shmona", center: [33.2072, 35.5695], radius: 5000 },
        { name: "Safed", center: [32.9647, 35.4950], radius: 5000 },
        { name: "Tiberias", center: [32.7940, 35.5300], radius: 6000 },
        { name: "Afula", center: [32.6044, 35.2897], radius: 6000 },
        { name: "Nazareth", center: [32.7018, 35.2985], radius: 6000 },
        { name: "Jenin", center: [32.4615, 35.2969], radius: 5000 },
        { name: "Beit Shean", center: [32.4969, 35.4997], radius: 5000 },
        { name: "Arad", center: [31.2587, 35.2137], radius: 5000 },
        { name: "Dimona", center: [31.0686, 35.0299], radius: 5000 },
        { name: "Mitzpe Ramon", center: [30.6103, 34.8011], radius: 5000 },
        { name: "Gaza", center: [31.5017, 34.4668], radius: 6000 },
        { name: "Jericho", center: [31.8607, 35.4444], radius: 5000 },
        { name: "Jordan Valley", center: [32.2000, 35.5500], radius: 8000 },
        
        // LARGE CITIES LAST (catch remaining locations)
        { name: "Tel Aviv", center: [32.0853, 34.7818], radius: 8000 },
        { name: "Jerusalem", center: [31.7683, 35.2137], radius: 12000 },
        { name: "Haifa", center: [32.7940, 34.9896], radius: 10000 },
        { name: "Beer Sheva", center: [31.2530, 34.7915], radius: 10000 },
        { name: "Eilat", center: [29.5577, 34.9519], radius: 8000 },
        
        // REGIONAL AREAS (LAST - catch everything else)
        { name: "Dead Sea Region", center: [31.3000, 35.4500], radius: 15000 },
        { name: "Golan Heights", center: [32.9000, 35.7500], radius: 12000 },
        { name: "Negev Desert", center: [30.5000, 34.8000], radius: 25000 }
    ];
};

// IMPROVED: Calculate City Clusters with better logic
const calculateCityClusters = (locations, clusterRadiusKm = 5) => {
    if (!locations || locations.length === 0) return {};
    
    // Get comprehensive cluster list
    const allClusters = getAllIsraeliClusters();
    
    const cityVisits = {};
    let unassignedCount = 0;
    
    // Count locations in each cluster
    for (const location of locations) {
        let assigned = false;
        
        // Check clusters in order (most specific first)
        for (const cluster of allClusters) {
            const distance = calculateDistance(
                location.latitude, location.longitude,
                cluster.center[0], cluster.center[1]
            );
            
            // Check if location is within cluster radius
            if (distance <= cluster.radius) {
                cityVisits[cluster.name] = (cityVisits[cluster.name] || 0) + 1;
                assigned = true;
                break; // Assign to first matching cluster (most specific)
            }
        }
        
        // If not in any cluster, assign to "Other"
        if (!assigned) {
            unassignedCount++;
        }
    }
    
    // Only add "Other" if there are unassigned locations
    if (unassignedCount > 0) {
        cityVisits["Other Areas"] = unassignedCount;
    }
    
    return cityVisits;
};

// Map coordinates to cluster name with comprehensive coverage
const mapCoordinatesToClusterName = (lat, lng) => {
    // Get comprehensive cluster list
    const clusters = getAllIsraeliClusters();
    
    // Find the first cluster that contains this location (most specific)
    for (const cluster of clusters) {
        const distance = calculateDistance(lat, lng, cluster.center[0], cluster.center[1]);
        
        if (distance <= cluster.radius) {
            return cluster.name;
        }
    }
    
    // If no cluster found, create a region-based name
    return getRegionalName(lat, lng);
};

// Get regional name for locations not in specific clusters
const getRegionalName = (lat, lng) => {
    // Regional boundaries for Israel
    if (lat >= 33.0) {
        return "Northern Border";
    } else if (lat >= 32.5) {
        return "Upper Galilee";
    } else if (lat >= 32.0) {
        if (lng <= 35.0) {
            return "Central Coast";
        } else {
            return "Lower Galilee";
        }
    } else if (lat >= 31.5) {
        if (lng <= 34.8) {
            return "Central Plain";
        } else {
            return "West Bank";
        }
    } else if (lat >= 31.0) {
        if (lng <= 34.7) {
            return "Southern Coast";
        } else {
            return "Judean Hills";
        }
    } else if (lat >= 30.0) {
        return "Northern Negev";
    } else {
        return "Southern Desert";
    }
};

// Map coordinates to area name (keep for backward compatibility)
const mapCoordinatesToAreaName = mapCoordinatesToClusterName;

export {
    calculateDistance,
    deduplicateLocations,
    findStops,
    calculateCityClusters,
    mapCoordinatesToAreaName,
    getAllIsraeliClusters
};