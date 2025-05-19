// Dashboard/modules/api.js

// API Configuration
const API_KEY = 'demo_api_key';
// Get base URL dynamically based on current location
const API_BASE_URL = `${window.location.protocol}//${window.location.host}/api`;

// Fetch users
const fetchUsers = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/users?api_key=${API_KEY}`);
        const data = await response.json();
        
        if (data.success) {
            return data.data;
        } else {
            console.error('Error fetching users:', data.message);
            return [];
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
};

// Fetch locations
const fetchLocations = async (userId, startTime, endTime, limit = 5000) => {
    let url = `${API_BASE_URL}/locations?api_key=${API_KEY}&start_time=${startTime}&end_time=${endTime}&limit=${limit}`;
    
    if (userId) {
        url += `&user_id=${userId}`;
    }
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            return data.data;
        } else {
            console.error('Error fetching locations:', data.message);
            return [];
        }
    } catch (error) {
        console.error('Error fetching locations:', error);
        return [];
    }
};

// Fetch user statistics
const fetchUserStatistics = async (userId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/user/statistics?api_key=${API_KEY}&user_id=${userId}`);
        const data = await response.json();
        
        if (data.success) {
            return data.data;
        } else {
            console.error('Error fetching user statistics:', data.message);
            return null;
        }
    } catch (error) {
        console.error('Error fetching user statistics:', error);
        return null;
    }
};

// Check if server is responsive
const pingServer = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/ping?api_key=${API_KEY}`);
        return response.ok;
    } catch (error) {
        console.error('Error pinging server:', error);
        return false;
    }
};

export {
    API_KEY,
    API_BASE_URL,
    fetchUsers,
    fetchLocations,
    fetchUserStatistics,
    pingServer
};