// Server/controllers/userController.js
const { User, getLocationModel } = require('../models');
const { calculateUserStatistics } = require('../utils/statsUtils');

// Get all users
const getUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ last_seen: -1 });
        
        res.json({
            success: true,
            message: `Found ${users.length} users`,
            data: users
        });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving users'
        });
    }
};

// Get user statistics - always calculate in real-time
const getUserStatistics = async (req, res) => {
    try {
        const userId = req.query.user_id;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }
        
        console.log(`📊 Calculating real-time statistics for user: ${userId}`);
        
        // Get user info
        const user = await User.findOne({ user_id: userId });
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Get user's locations
        const LocationModel = getLocationModel(userId);
        const locations = await LocationModel.find({}).sort({ timestamp: 1 });
        
        console.log(`Found ${locations.length} locations for user ${userId}`);
        
        // Calculate statistics in real-time
        const statistics = await calculateUserStatistics(userId, locations);
        
        console.log(`✓ Calculated statistics for user ${userId}:`);
        console.log(`  - Total locations: ${statistics.total_locations}`);
        console.log(`  - Distance traveled: ${(statistics.distance_traveled_meters / 1000).toFixed(1)} km`);
        console.log(`  - Common stops: ${statistics.common_stops ? statistics.common_stops.length : 0}`);
        
        res.json({
            success: true,
            message: 'Statistics calculated',
            data: statistics
        });
    } catch (error) {
        console.error('Error getting user statistics:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving statistics'
        });
    }
};

module.exports = {
    getUsers,
    getUserStatistics
};