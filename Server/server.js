// Server/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');

// Import controllers
const { saveBatchLocations, getLocations } = require('./controllers/locationController');
const { getUsers, getUserStatistics } = require('./controllers/userController');

// Import middleware
const { validateApiKey } = require('./middleware/auth');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
      res.type('application/javascript');
    }
    next();
  });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));

// Serve static files from Dashboard directory
app.use(express.static(path.join(__dirname, '../Dashboard')));

// Keep Render active - ping server every 5 minutes
setInterval(async () => {
    try {
        const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;
        await axios.get(`${serverUrl}/ping`);
        console.log('Ping server to keep alive:', new Date().toISOString());
    } catch (err) {
        console.error('Error pinging server:', err.message);
    }
}, 5 * 60 * 1000);

// Simple ping endpoint
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Add MongoDB connection monitoring
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected!');
});

// API Routes
app.post('/api/location/batch', validateApiKey, saveBatchLocations);
app.get('/api/locations', validateApiKey, getLocations);
app.get('/api/users', validateApiKey, getUsers);
app.get('/api/user/statistics', validateApiKey, getUserStatistics);

// Add a test route to verify server connectivity
app.get('/api/test', (req, res) => {
    console.log('Test endpoint called');
    res.json({ 
        success: true, 
        message: 'Server is running properly',
        time: new Date().toISOString(),
        env: {
            mongodb_connected: mongoose.connection.readyState === 1,
            node_env: process.env.NODE_ENV || 'development',
            api_key_configured: !!process.env.API_KEY,
            server_url_configured: !!process.env.SERVER_URL
        }
    });
});

// Serve the dashboard for any unmatched routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Dashboard/index.html'));
});

// Start the server
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API Key: ${process.env.API_KEY}`);
    console.log(`Server URL: ${process.env.SERVER_URL}`);
});