// Server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user_id: { 
        type: String, 
        required: true, 
        unique: true 
    },
    first_seen: { 
        type: Number 
    },
    last_seen: { 
        type: Number 
    },
    total_locations: { 
        type: Number, 
        default: 0 
    }
});

module.exports = mongoose.model('User', userSchema);