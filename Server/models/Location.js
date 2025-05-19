// Server/models/Location.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    user_id: { 
        type: String, 
        required: true, 
        index: true 
    },
    latitude: { 
        type: Number, 
        required: true 
    },
    longitude: { 
        type: Number, 
        required: true 
    },
    timestamp: { 
        type: Number, 
        required: true 
    },
    accuracy: { 
        type: Number 
    },
    device_info: { 
        type: String 
    }
});

// This is a factory function to create dynamic models for each user
const getLocationModel = (userId) => {
    // Check if model already exists to prevent overwriting
    if (mongoose.models[`Location_${userId}`]) {
        return mongoose.model(`Location_${userId}`);
    }
    
    // Create a new model with the user's ID as part of the collection name
    return mongoose.model(`Location_${userId}`, locationSchema);
};

module.exports = {
    locationSchema,
    getLocationModel
};