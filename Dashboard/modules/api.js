// Dashboard/modules/api.js

// API Configuration
const API_KEY = 'demo_api_key';
// Get base URL dynamically based on current location
const API_BASE_URL = `${window.location.protocol}//${window.location.host}/api`;

// Fetch users with better error handling and caching
const fetchUsers = async () => {
    try {
        console.log('🔍 Fetching users from API...');
        const response = await fetch(`${API_BASE_URL}/users?api_key=${API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Successfully fetched ${data.data.length} users`);
            return data.data;
        } else {
            console.error('❌ API returned error:', data.message);
            return [];
        }
    } catch (error) {
        console.error('❌ Error fetching users:', error);
        // Return empty array instead of throwing to prevent app crash
        return [];
    }
};

// Fetch locations with enhanced support for dynamic users
const fetchLocations = async (userId, startTime, endTime, limit = 5000) => {
    try {
        let url = `${API_BASE_URL}/locations?api_key=${API_KEY}&start_time=${startTime}&end_time=${endTime}&limit=${limit}`;
        
        // Handle different user selection scenarios
        if (userId && userId !== '' && userId !== 'null') {
            url += `&user_id=${encodeURIComponent(userId)}`;
            console.log(`🔍 Fetching locations for user: ${userId}`);
        } else {
            console.log('🔍 Fetching locations for all users');
        }
        
        console.log('📡 API URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Successfully fetched ${data.data.length} locations`);
            return data.data;
        } else {
            console.error('❌ API returned error:', data.message);
            return [];
        }
    } catch (error) {
        console.error('❌ Error fetching locations:', error);
        // Return empty array instead of throwing to prevent app crash
        return [];
    }
};

// Fetch user statistics (keeping for backward compatibility)
const fetchUserStatistics = async (userId) => {
    try {
        console.log(`📊 Fetching statistics for user: ${userId}`);
        const response = await fetch(`${API_BASE_URL}/user/statistics?api_key=${API_KEY}&user_id=${encodeURIComponent(userId)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Successfully fetched user statistics');
            return data.data;
        } else {
            console.error('❌ API returned error:', data.message);
            return null;
        }
    } catch (error) {
        console.error('❌ Error fetching user statistics:', error);
        return null;
    }
};

// Check if server is responsive with timeout
const pingServer = async (timeout = 5000) => {
    try {
        console.log('🏓 Pinging server...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(`${API_BASE_URL}/ping?api_key=${API_KEY}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const isOk = response.ok;
        console.log(isOk ? '✅ Server ping successful' : '❌ Server ping failed');
        return isOk;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Server ping timeout');
        } else {
            console.error('❌ Error pinging server:', error);
        }
        return false;
    }
};

// Test API connectivity and return detailed status
const testApiConnectivity = async () => {
    console.log('🧪 Testing API connectivity...');
    
    const results = {
        ping: false,
        users: false,
        locations: false,
        serverUrl: API_BASE_URL,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Test ping
        results.ping = await pingServer();
        
        // Test users endpoint
        if (results.ping) {
            const users = await fetchUsers();
            results.users = users && users.length > 0;
            results.userCount = users ? users.length : 0;
        }
        
        // Test locations endpoint (last 24 hours)
        if (results.users) {
            const endTime = Date.now();
            const startTime = endTime - (24 * 60 * 60 * 1000);
            const locations = await fetchLocations(null, startTime, endTime, 10);
            results.locations = locations && locations.length >= 0; // 0 or more is fine
            results.locationSample = locations ? locations.length : 0;
        }
        
    } catch (error) {
        console.error('❌ API connectivity test failed:', error);
    }
    
    console.log('📋 API Connectivity Results:', results);
    return results;
};

// Utility function to format API errors for user display
const formatApiError = (error, context = 'API call') => {
    if (error && error.message) {
        return `${context} failed: ${error.message}`;
    }
    return `${context} failed: Unknown error`;
};

// Cache management for better performance
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key) => {
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`📂 Using cached data for: ${key}`);
        return cached.data;
    }
    return null;
};

const setCachedData = (key, data) => {
    apiCache.set(key, {
        data: data,
        timestamp: Date.now()
    });
    console.log(`💾 Cached data for: ${key}`);
};

// Enhanced fetch users with caching
const fetchUsersWithCache = async () => {
    const cacheKey = 'users';
    
    // Try cache first
    const cached = getCachedData(cacheKey);
    if (cached) {
        return cached;
    }
    
    // Fetch fresh data
    const users = await fetchUsers();
    
    // Cache successful results
    if (users && users.length > 0) {
        setCachedData(cacheKey, users);
    }
    
    return users;
};

export {
    API_KEY,
    API_BASE_URL,
    fetchUsers,
    fetchUsersWithCache,
    fetchLocations,
    fetchUserStatistics,
    pingServer,
    testApiConnectivity,
    formatApiError,
    getCachedData,
    setCachedData
};