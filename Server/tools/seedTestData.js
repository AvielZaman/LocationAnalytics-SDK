// Server/tools/seedTestData.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { User, getLocationModel } = require('../models'); // Note: ../ to go up one directory

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

// Constants for all test users
const ALL_TEST_USERS = 'all_test_users';  // Combined user for all test users

// Define all 10 test user profiles with diverse locations across Israel
const USER_PROFILES = {
    'test_user_north': {  // Original north user
        displayName: "Test User (North)",
        clusters: [
            { name: "Tel Aviv", center: [32.0853, 34.7818], weight: 0.4 },
            { name: "Haifa", center: [32.7940, 34.9896], weight: 0.2 },
            { name: "Jerusalem", center: [31.7683, 35.2137], weight: 0.2 },
            { name: "Netanya", center: [32.3226, 34.8533], weight: 0.1 },
            { name: "Tiberias", center: [32.7940, 35.5300], weight: 0.1 }
        ],
        timeDistribution: {
            7: 0.15, 8: 0.2, 9: 0.1, 12: 0.1, 13: 0.05,
            17: 0.15, 18: 0.1, 19: 0.1, 20: 0.05
        }
    },
    'test_user_south': {  // Original south user
        displayName: "Test User (South)",
        clusters: [
            { name: "Beer Sheva", center: [31.2530, 34.7915], weight: 0.35 },
            { name: "Eilat", center: [29.5577, 34.9519], weight: 0.25 },
            { name: "Ashdod", center: [31.8040, 34.6550], weight: 0.2 },
            { name: "Jerusalem", center: [31.7683, 35.2137], weight: 0.1 },
            { name: "Tel Aviv", center: [32.0853, 34.7818], weight: 0.1 }
        ],
        timeDistribution: {
            10: 0.05, 11: 0.05, 12: 0.05, 16: 0.1, 17: 0.1,
            19: 0.1, 20: 0.15, 21: 0.15, 22: 0.15, 23: 0.1
        }
    },
    'test_user_coastal': {  // New coastal user
        displayName: "Coastal Explorer",
        clusters: [
            { name: "Netanya", center: [32.3226, 34.8533], weight: 0.3 },
            { name: "Herzliya", center: [32.1624, 34.8441], weight: 0.25 },
            { name: "Tel Aviv", center: [32.0853, 34.7818], weight: 0.2 },
            { name: "Caesarea", center: [32.5016, 34.8933], weight: 0.15 },
            { name: "Hadera", center: [32.4341, 34.9191], weight: 0.1 }
        ],
        timeDistribution: {
            6: 0.1, 7: 0.1, 8: 0.1, 14: 0.1, 15: 0.1,
            18: 0.2, 19: 0.15, 20: 0.1, 21: 0.05
        }
    },
    'test_user_mountain': {  // New mountain/central user
        displayName: "Mountain Dweller",
        clusters: [
            { name: "Jerusalem", center: [31.7683, 35.2137], weight: 0.4 },
            { name: "Bethlehem", center: [31.7054, 35.2024], weight: 0.2 },
            { name: "Ramallah", center: [31.8996, 35.2042], weight: 0.15 },
            { name: "Hebron", center: [31.5326, 35.0998], weight: 0.15 },
            { name: "Maaleh Adumim", center: [31.7730, 35.2954], weight: 0.1 }
        ],
        timeDistribution: {
            8: 0.15, 9: 0.15, 10: 0.1, 13: 0.1, 14: 0.1,
            16: 0.15, 17: 0.1, 19: 0.1, 21: 0.05
        }
    },
    'test_user_desert': {  // New desert/southern user
        displayName: "Desert Wanderer",
        clusters: [
            { name: "Beer Sheva", center: [31.2530, 34.7915], weight: 0.25 },
            { name: "Arad", center: [31.2587, 35.2137], weight: 0.2 },
            { name: "Dimona", center: [31.0686, 35.0299], weight: 0.2 },
            { name: "Eilat", center: [29.5577, 34.9519], weight: 0.2 },
            { name: "Mitzpe Ramon", center: [30.6103, 34.8011], weight: 0.15 }
        ],
        timeDistribution: {
            6: 0.1, 7: 0.15, 11: 0.1, 12: 0.1, 16: 0.15,
            17: 0.1, 18: 0.15, 20: 0.1, 22: 0.05
        }
    },
    'test_user_tech_hub': {  // New tech hub user
        displayName: "Tech Hub Worker",
        clusters: [
            { name: "Tel Aviv", center: [32.0853, 34.7818], weight: 0.35 },
            { name: "Ramat Gan", center: [32.0823, 34.8140], weight: 0.25 },
            { name: "Petah Tikva", center: [32.0878, 34.8878], weight: 0.15 },
            { name: "Bnei Brak", center: [32.0808, 34.8338], weight: 0.15 },
            { name: "Holon", center: [32.0167, 34.7667], weight: 0.1 }
        ],
        timeDistribution: {
            7: 0.1, 8: 0.2, 9: 0.15, 12: 0.1, 13: 0.05,
            17: 0.15, 18: 0.15, 19: 0.05, 20: 0.05
        }
    },
    'test_user_northern_border': {  // New northern border user
        displayName: "Northern Border Resident",
        clusters: [
            { name: "Kiryat Shmona", center: [33.2072, 35.5695], weight: 0.3 },
            { name: "Safed", center: [32.9647, 35.4950], weight: 0.25 },
            { name: "Nahariya", center: [33.0073, 35.0950], weight: 0.2 },
            { name: "Acre", center: [32.9234, 35.0818], weight: 0.15 },
            { name: "Metula", center: [33.2824, 35.5691], weight: 0.1 }
        ],
        timeDistribution: {
            6: 0.1, 8: 0.15, 9: 0.1, 15: 0.1, 16: 0.15,
            18: 0.15, 19: 0.1, 20: 0.1, 22: 0.05
        }
    },
    'test_user_valley': {  // New central valley user
        displayName: "Valley Commuter",
        clusters: [
            { name: "Afula", center: [32.6044, 35.2897], weight: 0.3 },
            { name: "Nazareth", center: [32.7018, 35.2985], weight: 0.25 },
            { name: "Jenin", center: [32.4615, 35.2969], weight: 0.2 },
            { name: "Beit Shean", center: [32.4969, 35.4997], weight: 0.15 },
            { name: "Umm al-Fahm", center: [32.5189, 35.1522], weight: 0.1 }
        ],
        timeDistribution: {
            7: 0.15, 8: 0.15, 9: 0.1, 14: 0.1, 15: 0.1,
            17: 0.15, 18: 0.1, 19: 0.1, 21: 0.05
        }
    },
    'test_user_port': {  // New southern port user
        displayName: "Port Worker",
        clusters: [
            { name: "Ashdod", center: [31.8040, 34.6550], weight: 0.35 },
            { name: "Ashkelon", center: [31.6688, 34.5742], weight: 0.25 },
            { name: "Gaza", center: [31.5017, 34.4668], weight: 0.15 },
            { name: "Kiryat Gat", center: [31.6100, 34.7642], weight: 0.15 },
            { name: "Sderot", center: [31.5240, 34.5965], weight: 0.1 }
        ],
        timeDistribution: {
            5: 0.1, 6: 0.15, 7: 0.15, 14: 0.15, 15: 0.15,
            16: 0.1, 18: 0.1, 20: 0.05, 22: 0.05
        }
    },
    'test_user_eastern': {  // New eastern user
        displayName: "Jordan Valley Explorer",
        clusters: [
            { name: "Tiberias", center: [32.7940, 35.5300], weight: 0.3 },
            { name: "Beit Shean", center: [32.4969, 35.4997], weight: 0.25 },
            { name: "Jericho", center: [31.8607, 35.4444], weight: 0.2 },
            { name: "Jordan Valley", center: [32.2000, 35.5500], weight: 0.15 },
            { name: "Ein Gedi", center: [31.4619, 35.3888], weight: 0.1 }
        ],
        timeDistribution: {
            6: 0.1, 7: 0.1, 11: 0.15, 12: 0.15, 16: 0.15,
            17: 0.1, 18: 0.1, 19: 0.1, 21: 0.05
        }
    }
};

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
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
}

// Weighted destination selection function
function selectWeightedDestination(stopPoints, excludeLocation = null) {
    // Filter out the exclude location
    const availableStops = stopPoints.filter(stop => stop !== excludeLocation);
    if (availableStops.length === 0) return stopPoints[0];
    
    // Create weighted selection based on cluster weights
    const totalWeight = availableStops.reduce((sum, stop) => sum + stop.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const stop of availableStops) {
        random -= stop.weight;
        if (random <= 0) {
            return stop;
        }
    }
    
    // Fallback
    return availableStops[0];
}

// Generate realistic location patterns with WEIGHTED selection
const generateRealisticLocations = (userId, userProfile, startTime, endTime) => {
    const locations = [];
    const clusters = userProfile.clusters;
    
    // Create WEIGHTED stop points for each cluster based on their weight
    const stopPoints = [];
    clusters.forEach(cluster => {
        // Number of stops based on weight (minimum 3, maximum 15)
        const numStops = Math.max(3, Math.floor(cluster.weight * 30));
        
        console.log(`  Creating ${numStops} stops for ${cluster.name} (weight: ${cluster.weight})`);
        
        for (let i = 0; i < numStops; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * 0.0015; // Within 150m of cluster center
            
            const latOffset = distance * Math.cos(angle);
            const lngOffset = distance * Math.sin(angle) / Math.cos(cluster.center[0] * Math.PI / 180);
            
            stopPoints.push({
                lat: cluster.center[0] + latOffset,
                lng: cluster.center[1] + lngOffset,
                city: cluster.name,
                cluster: cluster,
                weight: cluster.weight // Store weight for selection
            });
        }
    });
    
    console.log(`  Generated ${stopPoints.length} weighted stop points for ${userId}`);
    
    // Simulate daily patterns
    let currentTime = startTime;
    const oneDay = 24 * 60 * 60 * 1000;
    
    while (currentTime < endTime) {
        // Start of day
        const dayStart = currentTime;
        const dayEnd = Math.min(currentTime + oneDay, endTime);
        
        // Generate trips per day based on user activity
        const numTrips = 3 + Math.floor(Math.random() * 4); // 3-6 trips per day
        const tripTimes = [];
        
        // Generate trip times based on user's time distribution
        const activeHours = Object.keys(userProfile.timeDistribution).map(Number);
        for (let i = 0; i < numTrips; i++) {
            const hour = activeHours[Math.floor(Math.random() * activeHours.length)];
            const minute = Math.floor(Math.random() * 60);
            const tripTime = dayStart + (hour * 60 + minute) * 60 * 1000;
            if (tripTime < dayEnd) {
                tripTimes.push(tripTime);
            }
        }
        
        // Sort trip times
        tripTimes.sort((a, b) => a - b);
        
        // Start from a weighted random location
        let currentLocation = selectWeightedDestination(stopPoints);
        
        for (let i = 0; i < tripTimes.length; i++) {
            const tripStartTime = tripTimes[i];
            
            // Select destination using WEIGHTED selection (respects cluster weights)
            let destination = selectWeightedDestination(stopPoints, currentLocation);
            
            if (currentLocation && currentLocation !== destination) {
                // Generate path from current location to destination
                const pathLocations = generatePath(
                    currentLocation, 
                    destination, 
                    tripStartTime,
                    userId
                );
                locations.push(...pathLocations);
            }
            
            // Generate LONGER stops at destination (45-180 minutes)
            const stopDuration = 45 * 60 * 1000 + Math.random() * 135 * 60 * 1000;
            const stopLocations = generateStop(
                destination,
                tripStartTime + (currentLocation ? 15 * 60 * 1000 : 0), // Travel time
                stopDuration,
                userId
            );
            locations.push(...stopLocations);
            
            currentLocation = destination;
        }
        
        currentTime += oneDay;
    }
    
    return locations;
};

// Generate path between two points (with slower travel speed)
function generatePath(start, end, startTime, userId) {
    const locations = [];
    const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
    
    // Estimate travel time (20 km/h average speed)
    const travelTime = (distance / 1000) * 3 * 60 * 1000; // minutes to milliseconds
    
    // Number of points based on distance (1 point per km)
    const numPoints = Math.max(3, Math.floor(distance / 1000));
    
    for (let i = 0; i < numPoints; i++) {
        const progress = i / (numPoints - 1);
        
        // Linear interpolation with some random variation
        const lat = start.lat + (end.lat - start.lat) * progress + (Math.random() - 0.5) * 0.0003;
        const lng = start.lng + (end.lng - start.lng) * progress + (Math.random() - 0.5) * 0.0003;
        
        locations.push({
            user_id: userId,
            latitude: lat,
            longitude: lng,
            timestamp: startTime + travelTime * progress,
            accuracy: 10 + Math.random() * 20,
            device_info: "Test Device / Android 11"
        });
    }
    
    return locations;
}

// Generate stop at a location (with MORE points for better stop detection)
function generateStop(stopPoint, startTime, duration, userId) {
    const locations = [];
    const numPoints = Math.max(8, Math.floor(duration / (3 * 60 * 1000))); // More points per stop
    
    for (let i = 0; i < numPoints; i++) {
        // Small random movement within 50m
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * 0.0005; // ~50m
        
        const lat = stopPoint.lat + distance * Math.cos(angle);
        const lng = stopPoint.lng + distance * Math.sin(angle) / Math.cos(stopPoint.lat * Math.PI / 180);
        
        locations.push({
            user_id: userId,
            latitude: lat,
            longitude: lng,
            timestamp: startTime + (duration * i) / (numPoints - 1),
            accuracy: 5 + Math.random() * 10,
            device_info: "Test Device / Android 11"
        });
    }
    
    return locations;
}

async function seedTestData() {
    try {
        console.log('🌱 Starting to seed test data for 10 users...');
        console.log(`📍 Test users to seed:`);
        Object.keys(USER_PROFILES).forEach(userId => {
            console.log(`   - ${userId} (${USER_PROFILES[userId].displayName})`);
        });
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Generate time range (last 7 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();
        
        console.log(`📅 Generating data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
        // Set a fixed seed for consistent data
        Math.random = (function() {
            let seed = 12345;
            return function() {
                seed = (seed * 9301 + 49297) % 233280;
                return seed / 233280;
            };
        })();
        
        // Process individual test users
        for (const [userId, userProfile] of Object.entries(USER_PROFILES)) {
            console.log(`\n📍 Processing user: ${userId} (${userProfile.displayName})`);
            
            // Check if user already exists
            let user = await User.findOne({ user_id: userId });
            
            // Generate realistic locations with weighted selection
            const locations = generateRealisticLocations(userId, userProfile, startTime, endTime);
            console.log(`✓ Generated ${locations.length} locations for ${userId}`);
            
            // Calculate first and last seen
            const firstSeen = locations.reduce((min, loc) => Math.min(min, loc.timestamp), Infinity);
            const lastSeen = locations.reduce((max, loc) => Math.max(max, loc.timestamp), 0);
            
            if (!user) {
                // Create new user
                user = new User({
                    user_id: userId,
                    first_seen: firstSeen,
                    last_seen: lastSeen,
                    total_locations: 0
                });
                await user.save();
                console.log(`✓ Created user ${userId}`);
            } else {
                console.log(`✓ User ${userId} already exists, updating...`);
            }
            
            // Get the location model for this user
            const LocationModel = getLocationModel(userId);
            
            // Clear existing locations for this user (if any)
            await LocationModel.deleteMany({});
            console.log(`✓ Cleared existing locations for ${userId}`);
            
            // Insert locations
            await LocationModel.insertMany(locations);
            console.log(`✓ Inserted ${locations.length} locations for ${userId}`);
            
            // Update user's location count
            await User.updateOne(
                { user_id: userId },
                { 
                    total_locations: locations.length,
                    first_seen: firstSeen,
                    last_seen: lastSeen
                }
            );
            console.log(`✓ Updated user ${userId} metadata`);
        }
        
        // Create/Update ALL_TEST_USERS entry (this will be handled dynamically now)
        console.log(`\n📍 Processing combined user: ${ALL_TEST_USERS}`);
        
        // Check if all_test_users already exists
        let allUsersUser = await User.findOne({ user_id: ALL_TEST_USERS });
        
        if (!allUsersUser) {
            // Create placeholder user - actual data will be calculated dynamically
            allUsersUser = new User({
                user_id: ALL_TEST_USERS,
                first_seen: startTime,
                last_seen: endTime,
                total_locations: 0
            });
            await allUsersUser.save();
            console.log(`✓ Created placeholder user ${ALL_TEST_USERS}`);
        } else {
            console.log(`✓ User ${ALL_TEST_USERS} already exists - data will be calculated dynamically`);
        }
        
        console.log('\n✅ Test data seeded successfully with WEIGHTED generation!');
        console.log('📊 Note: Locations now properly respect cluster weights');
        console.log('📅 Dashboard should show date range from', startDate.toDateString(), 'to', endDate.toDateString());
        console.log('👥 Total users created:', Object.keys(USER_PROFILES).length);
        
    } catch (error) {
        console.error('❌ Error seeding test data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Run the seeding
seedTestData();