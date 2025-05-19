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

// Get locations by user ID and time range
const getLocations = async (req, res) => {
    try {
        const userId = req.query.user_id;
        const limit = parseInt(req.query.limit) || 1000;
        const startTime = parseInt(req.query.start_time) || 0;
        const endTime = parseInt(req.query.end_time) || Date.now();
        
        console.log(`🔍 Fetching locations - User ID: ${userId || 'all'}, Start: ${new Date(startTime).toISOString()}, End: ${new Date(endTime).toISOString()}`);
        
        let locations = [];
        
        if (userId) {
            // Get locations for specific user
            const LocationModel = getLocationModel(userId);
            locations = await LocationModel.find({
                timestamp: { $gte: startTime, $lte: endTime }
            })
            .sort({ timestamp: -1 })
            .limit(limit);
            
            console.log(`✓ Found ${locations.length} locations for user ${userId}`);
        } else {
            // Get locations for all users
            const users = await User.find({});
            console.log(`✓ Found ${users.length} users`);
            
            for (const user of users) {
                const userLimit = Math.floor(limit / users.length);
                const LocationModel = getLocationModel(user.user_id);
                
                const userLocations = await LocationModel.find({
                    timestamp: { $gte: startTime, $lte: endTime }
                })
                .sort({ timestamp: -1 })
                .limit(userLimit);
                
                console.log(`✓ Found ${userLocations.length} locations for user ${user.user_id}`);
                locations = locations.concat(userLocations);
            }
            
            // Sort combined locations by timestamp
            locations.sort((a, b) => b.timestamp - a.timestamp);
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

module.exports = {
    saveBatchLocations,
    getLocations
};