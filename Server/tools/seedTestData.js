// Server/seedTestData.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { User, getLocationModel } = require('../models');

// Load environment variables
dotenv.config();

// Constants matching the original testData.js
const TEST_USER_ID = 'test_user';  // North user
const TEST_USER_SOUTH_ID = 'test_user_south';  // South user
const ALL_TEST_USERS = 'all_test_users';  // Combined user

// Define test user profiles (SAME AS ORIGINAL testData.js)
const USER_PROFILES = {
    [TEST_USER_ID]: {  // North user
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
    [TEST_USER_SOUTH_ID]: {  // South user
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

// Generate realistic location patterns with LESS TRAVEL
const generateRealisticLocations = (userId, userProfile, startTime, endTime) => {
    const locations = [];
    const clusters = userProfile.clusters;
    
    // Create MORE stop points for each cluster
    const stopPoints = [];
    clusters.forEach(cluster => {
        // Create 4-7 stop points per cluster (increased for more stops)
        const numStops = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numStops; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * 0.001; // Within 100m of cluster center
            
            const latOffset = distance * Math.cos(angle);
            const lngOffset = distance * Math.sin(angle) / Math.cos(cluster.center[0] * Math.PI / 180);
            
            stopPoints.push({
                lat: cluster.center[0] + latOffset,
                lng: cluster.center[1] + lngOffset,
                city: cluster.name,
                cluster: cluster
            });
        }
    });
    
    // Simulate daily patterns
    let currentTime = startTime;
    const oneDay = 24 * 60 * 60 * 1000;
    
    while (currentTime < endTime) {
        // Start of day
        const dayStart = currentTime;
        const dayEnd = Math.min(currentTime + oneDay, endTime);
        
        // Generate FEWER trips per day (1-3 instead of 3-6)
        const numTrips = 1 + Math.floor(Math.random() * 3);
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
        
        // Generate locations for each trip
        let currentLocation = stopPoints[Math.floor(Math.random() * stopPoints.length)]; // Start from a random stop
        
        for (let i = 0; i < tripTimes.length; i++) {
            const tripStartTime = tripTimes[i];
            
            // Select destination - prefer closer locations more often
            let destination;
            const preferCloseDestination = Math.random() < 0.7; // 70% chance to pick a closer destination
            
            if (preferCloseDestination && currentLocation) {
                // Find stops within the same cluster or nearby
                const nearbyStops = stopPoints.filter(stop => 
                    stop.cluster === currentLocation.cluster || 
                    calculateDistance(currentLocation.lat, currentLocation.lng, stop.lat, stop.lng) < 5000 // Within 5km
                );
                
                if (nearbyStops.length > 1) {
                    do {
                        destination = nearbyStops[Math.floor(Math.random() * nearbyStops.length)];
                    } while (destination === currentLocation);
                } else {
                    destination = stopPoints[Math.floor(Math.random() * stopPoints.length)];
                }
            } else {
                // Random destination
                do {
                    destination = stopPoints[Math.floor(Math.random() * stopPoints.length)];
                } while (currentLocation && calculateDistance(
                    currentLocation.lat, currentLocation.lng,
                    destination.lat, destination.lng
                ) < 500); // At least 500m away
            }
            
            if (currentLocation) {
                // Generate path from current location to destination
                const pathLocations = generatePath(
                    currentLocation, 
                    destination, 
                    tripStartTime,
                    userId
                );
                locations.push(...pathLocations);
            }
            
            // Generate LONGER stops at destination (30-120 minutes)
            const stopDuration = 30 * 60 * 1000 + Math.random() * 90 * 60 * 1000;
            const stopLocations = generateStop(
                destination,
                tripStartTime + (currentLocation ? 20 * 60 * 1000 : 0), // Travel time
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
    
    // Estimate travel time (15 km/h average speed - reduced from 30)
    const travelTime = (distance / 1000) * 4 * 60 * 1000; // minutes to milliseconds
    
    // Number of points based on distance (1 point per km)
    const numPoints = Math.max(5, Math.floor(distance / 1000));
    
    for (let i = 0; i < numPoints; i++) {
        const progress = i / (numPoints - 1);
        
        // Linear interpolation with some random variation
        const lat = start.lat + (end.lat - start.lat) * progress + (Math.random() - 0.5) * 0.0005;
        const lng = start.lng + (end.lng - start.lng) * progress + (Math.random() - 0.5) * 0.0005;
        
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
    const numPoints = Math.max(10, Math.floor(duration / (5 * 60 * 1000))); // More points per stop
    
    for (let i = 0; i < numPoints; i++) {
        // Small random movement within 30m
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * 0.0003; // ~30m
        
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

// Generate all test users data
const generateAllTestUsersData = (startTime, endTime) => {
    const allUserLocations = [];
    
    // Generate locations for both test users
    Object.keys(USER_PROFILES).forEach(userId => {
        const userProfile = USER_PROFILES[userId];
        const locations = generateRealisticLocations(userId, userProfile, startTime, endTime);
        
        // Add to all users collection with ALL_TEST_USERS as user_id
        const allUsersLocations = locations.map(loc => ({
            ...loc,
            user_id: ALL_TEST_USERS
        }));
        
        allUserLocations.push(...allUsersLocations);
    });
    
    return allUserLocations;
};

async function seedTestData() {
    try {
        console.log('🌱 Starting to seed test data...');
        console.log(`📍 Test users to seed:`);
        console.log(`   - ${TEST_USER_ID} (North)`);
        console.log(`   - ${TEST_USER_SOUTH_ID} (South)`);
        console.log(`   - ${ALL_TEST_USERS} (Combined data from both users)`);
        
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
            
            // Generate realistic locations
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
            }
            
            // Get the location model for this user
            const LocationModel = getLocationModel(userId);
            
            // Clear existing locations for this user (if any)
            await LocationModel.deleteMany({});
            console.log(`✓ Cleared existing locations for ${userId}`);
            
            // Insert locations (no duplicates for realistic data)
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
        
        // Create ALL_TEST_USERS entry
        console.log(`\n📍 Processing combined user: ${ALL_TEST_USERS}`);
        
        // Check if all_test_users already exists
        let allUsersUser = await User.findOne({ user_id: ALL_TEST_USERS });
        
        // Generate combined locations
        const allUserLocations = generateAllTestUsersData(startTime, endTime);
        console.log(`✓ Generated ${allUserLocations.length} locations for ${ALL_TEST_USERS}`);
        
        // Calculate first and last seen
        const firstSeen = allUserLocations.reduce((min, loc) => Math.min(min, loc.timestamp), Infinity);
        const lastSeen = allUserLocations.reduce((max, loc) => Math.max(max, loc.timestamp), 0);
        
        if (!allUsersUser) {
            // Create new user
            allUsersUser = new User({
                user_id: ALL_TEST_USERS,
                first_seen: firstSeen,
                last_seen: lastSeen,
                total_locations: 0
            });
            await allUsersUser.save();
            console.log(`✓ Created user ${ALL_TEST_USERS}`);
        }
        
        // Get the location model for ALL_TEST_USERS
        const AllUsersLocationModel = getLocationModel(ALL_TEST_USERS);
        
        // Clear existing locations (if any)
        await AllUsersLocationModel.deleteMany({});
        console.log(`✓ Cleared existing locations for ${ALL_TEST_USERS}`);
        
        // Insert locations
        await AllUsersLocationModel.insertMany(allUserLocations);
        console.log(`✓ Inserted ${allUserLocations.length} locations for ${ALL_TEST_USERS}`);
        
        // Update user's location count
        await User.updateOne(
            { user_id: ALL_TEST_USERS },
            { 
                total_locations: allUserLocations.length,
                first_seen: firstSeen,
                last_seen: lastSeen
            }
        );
        console.log(`✓ Updated user ${ALL_TEST_USERS} metadata`);
        
        console.log('\n✅ Test data seeded successfully!');
        console.log('📊 Note: Statistics will be calculated in real-time when requested');
        console.log('📅 Dashboard should show date range from', startDate.toDateString(), 'to', endDate.toDateString());
        
    } catch (error) {
        console.error('❌ Error seeding test data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Run the seeding
seedTestData();