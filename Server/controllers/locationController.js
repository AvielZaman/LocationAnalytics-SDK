// Server/controllers/locationController.js
const { User, getLocationModel } = require('../models');

// Save batch of locations
const saveBatchLocations = async (req, res) => {
    try {
        console.log('📥 Received location batch request:', JSON.stringify(req.body));
        
        const { locations } = req.body;
        
        if (!Array.isArray(locations) || locations.length === 0) {
            console.log('❌ Invalid location data format:', req.body);
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid or empty locations array' 
            });
        }
        
        console.log(`✓ Processing ${locations.length} locations`);
        
        // Group locations by user ID
        const locationsByUser = {};
        
        locations.forEach(location => {
            if (!locationsByUser[location.user_id]) {
                locationsByUser[location.user_id] = [];
            }
            locationsByUser[location.user_id].push(location);
        });
        
        console.log(`✓ Found locations for ${Object.keys(locationsByUser).length} users`);
        
        // Process each user's locations
        for (const userId in locationsByUser) {
            const userLocations = locationsByUser[userId];
            console.log(`📍 Processing ${userLocations.length} locations for user ${userId}`);
            
            // Find or create user
            let user = await User.findOne({ user_id: userId });
            const firstSeen = userLocations.reduce((min, loc) => 
                Math.min(min, loc.timestamp), Infinity);
            const lastSeen = userLocations.reduce((max, loc) => 
                Math.max(max, loc.timestamp), 0);
            
            if (!user) {
                console.log(`👤 Creating new user: ${userId}`);
                user = new User({
                    user_id: userId,
                    first_seen: firstSeen,
                    last_seen: lastSeen,
                    total_locations: 0
                });
                await user.save();
                console.log(`✓ User ${userId} created successfully`);
            } else {
                console.log(`👤 Updating existing user: ${userId}`);
                // Update user metadata
                await User.updateOne(
                    { user_id: userId },
                    { 
                        $min: { first_seen: firstSeen },
                        $max: { last_seen: lastSeen }
                    }
                );
                console.log(`✓ User ${userId} updated successfully`);
            }
            
            // Get the location model for this user
            const LocationModel = getLocationModel(userId);
            
            // Create 3 copies of each location for better heatmap
            const locationsToInsert = [];
            
            for (const location of userLocations) {
                // Add original location
                locationsToInsert.push(location);
                
                // Add duplicates with small variations
                for (let i = 0; i < 2; i++) {
                    const variation = (Math.random() - 0.5) * 0.0005;
                    locationsToInsert.push({
                        ...location,
                        latitude: location.latitude + variation,
                        longitude: location.longitude + variation
                    });
                }
            }
            
            // Insert all locations
            try {
                await LocationModel.insertMany(locationsToInsert);
                console.log(`✓ Inserted ${locationsToInsert.length} locations for user ${userId}`);
            } catch (err) {
                console.error(`❌ Error inserting locations for user ${userId}:`, err);
                throw err;
            }
            
            // Update location count
            try {
                await User.updateOne(
                    { user_id: userId },
                    { $inc: { total_locations: locationsToInsert.length } }
                );
                console.log(`✓ Updated location count for user ${userId}`);
            } catch (err) {
                console.error(`❌ Error updating location count for user ${userId}:`, err);
                throw err;
            }
        }
        
        res.json({ 
            success: true, 
            message: `Saved ${locations.length * 3} locations (including duplicates for heatmap)` 
        });
    } catch (error) {
        console.error('❌ Error saving location data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error saving location data' 
        });
    }
};

// Get locations by user ID and time range with dynamic "all test users" support
const getLocations = async (req, res) => {
    try {
        const userId = req.query.user_id;
        const limit = parseInt(req.query.limit) || 5000;
        const startTime = parseInt(req.query.start_time) || 0;
        const endTime = parseInt(req.query.end_time) || Date.now();
        
        console.log(`🔍 Fetching locations - User ID: ${userId || 'all'}, Start: ${new Date(startTime).toISOString()}, End: ${new Date(endTime).toISOString()}`);
        
        let locations = [];
        
        if (userId && userId !== 'all_test_users') {
            // Get locations for specific user
            const LocationModel = getLocationModel(userId);
            locations = await LocationModel.find({
                timestamp: { $gte: startTime, $lte: endTime }
            })
            .sort({ timestamp: -1 })
            .limit(limit);
            
            console.log(`✓ Found ${locations.length} locations for user ${userId}`);
        } else {
            // Get locations for all users (dynamic "all test users")
            console.log('🔄 Fetching all users for dynamic "all test users" calculation');
            
            // Get all users except the 'all_test_users' placeholder
            const users = await User.find({ 
                user_id: { $ne: 'all_test_users' } 
            });
            console.log(`✓ Found ${users.length} individual users`);
            
            if (users.length === 0) {
                console.log('⚠️ No individual users found');
                return res.json({
                    success: true,
                    message: 'No users found',
                    data: []
                });
            }
            
            // For averaging heatmap, we'll collect locations from all users
            // and then sample them to create an averaged effect
            const allUserLocations = [];
            const userLimitPerUser = Math.floor(limit / users.length);
            
            for (const user of users) {
                try {
                    const LocationModel = getLocationModel(user.user_id);
                    
                    const userLocations = await LocationModel.find({
                        timestamp: { $gte: startTime, $lte: endTime }
                    })
                    .sort({ timestamp: -1 })
                    .limit(userLimitPerUser);
                    
                    console.log(`✓ Found ${userLocations.length} locations for user ${user.user_id}`);
                    
                    // Add user identifier for averaging logic
                    const locationsWithUser = userLocations.map(loc => ({
                        ...loc.toObject(),
                        original_user_id: user.user_id
                    }));
                    
                    allUserLocations.push(...locationsWithUser);
                } catch (error) {
                    console.error(`❌ Error fetching locations for user ${user.user_id}:`, error);
                    // Continue with other users even if one fails
                }
            }
            
            // For "all test users", we want to create an averaged heatmap effect
            // Group nearby locations and average their positions
            console.log(`🧮 Processing ${allUserLocations.length} total locations for averaging`);
            
            if (userId === 'all_test_users') {
                // Create averaged heatmap data
                locations = createAveragedHeatmapData(allUserLocations, users.length);
                console.log(`✓ Created ${locations.length} averaged heatmap points`);
            } else {
                // For regular "all users" view, just combine all locations
                locations = allUserLocations;
                // Sort combined locations by timestamp
                locations.sort((a, b) => b.timestamp - a.timestamp);
                
                // Apply global limit
                if (locations.length > limit) {
                    locations = locations.slice(0, limit);
                }
            }
        }
        
        res.json({
            success: true,
            message: `Found ${locations.length} locations`,
            data: locations
        });
    } catch (error) {
        console.error('❌ Error getting locations:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving locations' 
        });
    }
};

// Create averaged heatmap data from multiple users' locations
const createAveragedHeatmapData = (allLocations, numUsers) => {
    console.log(`🎯 Creating averaged heatmap from ${allLocations.length} locations across ${numUsers} users`);
    
    // Grid size for averaging (in degrees, approximately 100m)
    const gridSize = 0.001;
    
    // Create a grid to group nearby locations
    const locationGrid = new Map();
    
    allLocations.forEach(location => {
        // Round coordinates to grid
        const gridLat = Math.round(location.latitude / gridSize) * gridSize;
        const gridLng = Math.round(location.longitude / gridSize) * gridSize;
        const gridKey = `${gridLat.toFixed(6)},${gridLng.toFixed(6)}`;
        
        if (!locationGrid.has(gridKey)) {
            locationGrid.set(gridKey, {
                coordinates: { lat: gridLat, lng: gridLng },
                locations: [],
                userCounts: new Set(),
                totalCount: 0
            });
        }
        
        const gridCell = locationGrid.get(gridKey);
        gridCell.locations.push(location);
        gridCell.userCounts.add(location.original_user_id);
        gridCell.totalCount++;
    });
    
    // Convert grid to averaged locations
    const averagedLocations = [];
    
    locationGrid.forEach((gridCell, gridKey) => {
        // Calculate average position
        const avgLat = gridCell.locations.reduce((sum, loc) => sum + loc.latitude, 0) / gridCell.locations.length;
        const avgLng = gridCell.locations.reduce((sum, loc) => sum + loc.longitude, 0) / gridCell.locations.length;
        
        // Calculate average timestamp
        const avgTimestamp = gridCell.locations.reduce((sum, loc) => sum + loc.timestamp, 0) / gridCell.locations.length;
        
        // Calculate intensity based on number of users who visited this area
        const userVisitRatio = gridCell.userCounts.size / numUsers; // 0 to 1
        const locationDensity = Math.min(gridCell.totalCount, 50); // Cap at 50 for visualization
        
        // Create multiple averaged points based on the intensity
        // More users visiting = more points in the heatmap
        const pointsToCreate = Math.max(1, Math.floor(userVisitRatio * locationDensity * 0.5));
        
        for (let i = 0; i < pointsToCreate; i++) {
            // Add small variations to create natural-looking heatmap
            const variation = 0.0002; // ~20m variation
            const angle = (Math.PI * 2 * i) / pointsToCreate;
            
            averagedLocations.push({
                user_id: 'all_test_users',
                latitude: avgLat + (Math.random() - 0.5) * variation * Math.cos(angle),
                longitude: avgLng + (Math.random() - 0.5) * variation * Math.sin(angle),
                timestamp: avgTimestamp + (Math.random() - 0.5) * 3600000, // ±30 minutes
                accuracy: 10 + Math.random() * 10,
                device_info: "Averaged Test Device",
                // Additional metadata for debugging
                original_user_count: gridCell.userCounts.size,
                total_location_count: gridCell.totalCount,
                intensity_factor: userVisitRatio
            });
        }
    });
    
    console.log(`✓ Created ${averagedLocations.length} averaged points from ${locationGrid.size} grid cells`);
    
    // Sort by timestamp and return
    return averagedLocations.sort((a, b) => b.timestamp - a.timestamp);
};

module.exports = {
    saveBatchLocations,
    getLocations
};