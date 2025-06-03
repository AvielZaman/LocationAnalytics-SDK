// Dashboard/script.js
import { 
    fetchUsers, 
    fetchLocations, 
    fetchUserStatistics, 
    pingServer 
} from './modules/api.js';

import { 
    initializeMap,
    renderHeatMap,
    renderPathMap,
    renderStopsMap,
    renderAverageStopsForAllUsers
} from './modules/maps.js';

import {
    updateActivityHoursChart,
    updateCityVisitsChart,
    updateTimelineChart
} from './modules/charts.js';

import {
    deduplicateLocations,
    calculateDistance,
    calculateCityClusters,
    findStops
} from './modules/geoUtils.js';

import {
    createStatusIndicator,
    updateConnectionStatus,
    showLoading,
    hideLoading,
    setDefaultDateRange,
    populateUserSelect,
    updateStatsDisplay,
    updateStopsList,
    updateMapModeButtons
} from './modules/ui.js';

// Constants
const USE_TEST_DATA = true; // When true, uses test users from database
const ALL_TEST_USERS = 'all_test_users';  // Combined user

// LocalStorage keys
const STORAGE_KEY_SELECTED_USER = 'selectedUser';
const STORAGE_KEY_START_DATE = 'startDate';
const STORAGE_KEY_END_DATE = 'endDate';
const STORAGE_KEY_MAP_MODE = 'mapMode';

// DOM Elements
const userSelect = document.getElementById('user-select');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const refreshBtn = document.getElementById('refresh-btn');
const totalUsersEl = document.getElementById('total-users');
const totalLocationsEl = document.getElementById('total-locations');
const totalDistanceEl = document.getElementById('total-distance');
const activeHoursEl = document.getElementById('active-hours');
const mapContainer = document.getElementById('map-container');
const heatMapBtn = document.getElementById('heat-map-btn');
const pathMapBtn = document.getElementById('path-map-btn');
const stopsMapBtn = document.getElementById('stops-map-btn');
const stopsList = document.getElementById('stops-list');
const activityHoursChart = document.getElementById('activity-hours-chart');
const cityVisitsChart = document.getElementById('city-visits-chart');
const timelineChart = document.getElementById('timeline-chart');

// State
let selectedUser = null;
let locationsData = [];
let statistics = {};
let mapMode = 'heat'; // 'heat', 'path', 'stops'
let map;
let mapLayers;
let allUsers = []; // Store all users loaded from database

// Initialize
async function init() {
    console.log("Initializing dashboard...");
    
    // Restore state from localStorage
    restoreStateFromStorage();
    
    // Add connection status indicator
    const statusIndicator = createStatusIndicator();
    updateConnectionStatus(statusIndicator, 'Initializing...', null);
    
    // Initialize Leaflet map
    const mapObjects = initializeMap(mapContainer);
    map = mapObjects.map;
    mapLayers = mapObjects.layers;
    
    // Set initial empty state - no map mode active
    mapMode = 'none';
    
    // Make sure no buttons are highlighted initially
    heatMapBtn.classList.remove('active');
    pathMapBtn.classList.remove('active');
    stopsMapBtn.classList.remove('active');
    
    if (USE_TEST_DATA) {
        // Using test data from MongoDB
        updateConnectionStatus(statusIndicator, 'Loading users from database', true);
        await setupDynamicUsersFromDatabase();
        
        // Make sure path button state is correct on init
        updatePathButtonState();
    } else {
        // Check connection
        const isConnected = await pingServer();
        updateConnectionStatus(statusIndicator, isConnected ? 'Connected' : 'Connection failed', isConnected);
        
        // Set up event listeners
        setupEventListeners();
        
        // Fetch initial data
        try {
            await loadUsersAndSetupUI();
            fetchData();
            
            // Check path button after loading data
            updatePathButtonState();
        } catch (error) {
            console.error('Error during initialization:', error);
            updateConnectionStatus(statusIndicator, 'Error loading data', false);
        }
    }
    
    // Setup periodic connection check if not using test data
    if (!USE_TEST_DATA) {
        setInterval(async () => {
            const isConnected = await pingServer();
            updateConnectionStatus(statusIndicator, isConnected ? 'Connected' : 'Connection issues', isConnected);
        }, 30000);
    }
    
    // Clear the map initially (no visualization shown)
    Object.values(mapLayers).forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
        
        if (typeof layer.clearLayers === 'function') {
            layer.clearLayers();
        }
    });
    
    console.log("Map initialized in empty state with mode: none");
}

// Setup Dynamic Users from Database
async function setupDynamicUsersFromDatabase() {
    console.log("Setting up dynamic users from database...");
    
    try {
        // Load all users from database
        await loadUsersAndSetupUI();
        
        if (allUsers.length === 0) {
            console.error("No users found in database. Please run seedTestData.js first.");
            updateConnectionStatus(document.getElementById('connection-status'), 'No users found', false);
            return;
        }
        
        // Setup event listeners
        await setupEventListeners();
        
        // Restore selected user in dropdown or set default
        if (selectedUser && allUsers.some(u => u.user_id === selectedUser)) {
            userSelect.value = selectedUser;
        } else {
            // Default to first individual user (not 'all_test_users')
            const firstIndividualUser = allUsers.find(u => u.user_id !== ALL_TEST_USERS);
            selectedUser = firstIndividualUser ? firstIndividualUser.user_id : allUsers[0].user_id;
            userSelect.value = selectedUser;
            saveStateToStorage();
        }
        
        // Fetch initial test data
        await fetchTestDataFromDatabase();
        
        // Update UI with test data
        updateUI();
        
        // Update status
        updateConnectionStatus(document.getElementById('connection-status'), 'Users loaded from database', true);
    } catch (error) {
        console.error('Error setting up dynamic users from database:', error);
        updateConnectionStatus(document.getElementById('connection-status'), 'Error loading users', false);
    }
}

// Load users and setup UI dynamically
async function loadUsersAndSetupUI() {
    console.log("Loading users from database...");
    
    try {
        // Fetch all users from database
        const users = await fetchUsers();
        console.log("Raw users from database:", users);
        
        if (!users || users.length === 0) {
            throw new Error("No users found in database");
        }
        
        // Filter and sort users
        allUsers = users.filter(user => user.user_id) // Ensure user has an ID
            .sort((a, b) => {
                // Sort: 'all_test_users' first, then alphabetically
                if (a.user_id === ALL_TEST_USERS) return -1;
                if (b.user_id === ALL_TEST_USERS) return 1;
                return a.user_id.localeCompare(b.user_id);
            });
        
        console.log(`Found ${allUsers.length} users:`, allUsers.map(u => u.user_id));
        
        // Create dropdown options with display names
        const dropdownUsers = allUsers.map(user => {
            let displayName;
            
            // Create friendly display names
            if (user.user_id === ALL_TEST_USERS) {
                displayName = "All Test Users";
            } else {
                // Convert user_id to friendly name
                displayName = user.user_id
                    .replace(/test_user_?/, '')
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase()) || user.user_id;
                
                // Handle special cases
                if (displayName.trim() === '') displayName = "Test User (Main)";
                if (displayName === "North") displayName = "Test User (North)";
                if (displayName === "South") displayName = "Test User (South)";
            }
            
            return { 
                user_id: user.user_id, 
                display_name: displayName 
            };
        });
        
        // Populate the dropdown
        populateUserSelect(userSelect, dropdownUsers, true);
        
        console.log("Successfully populated user dropdown with", dropdownUsers.length, "users");
        
    } catch (error) {
        console.error('Error loading users:', error);
        throw error;
    }
}

// Fetch test data from database with dynamic user support
async function fetchTestDataFromDatabase() {
    console.log("Fetching test data from database...");
    
    try {
        // Get date range
        const startTime = new Date(startDateInput.value).getTime();
        const endTime = new Date(endDateInput.value).getTime() + (24 * 60 * 60 * 1000 - 1);
        
        console.log(`Date range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
        
        // Fetch data for selected user
        locationsData = await fetchLocations(selectedUser, startTime, endTime);
        
        console.log(`Fetched ${locationsData.length} locations from database for period`);
        
        // Handle statistics calculation differently for all users vs individual users
        if (selectedUser === ALL_TEST_USERS) {
            // For all users, we need to calculate combined statistics properly
            console.log("Calculating combined statistics for all users");
            
            // Get all individual users (excluding 'all_test_users')
            const individualUsers = allUsers.filter(u => u.user_id !== ALL_TEST_USERS);
            
            if (individualUsers.length === 0) {
                console.warn("No individual users found for combined statistics");
                statistics = {
                    user_id: ALL_TEST_USERS,
                    total_locations: 0,
                    distance_traveled_meters: 0,
                    activity_hours: {},
                    common_stops: [],
                    city_visits: {}
                };
            } else {
                // Fetch individual user data and combine
                const allUserStats = [];
                
                for (const user of individualUsers) {
                    const userLocations = await fetchLocations(user.user_id, startTime, endTime);
                    const userStats = calculateStatisticsFromLocations(user.user_id, userLocations);
                    allUserStats.push(userStats);
                }
                
                // Combine statistics properly
                statistics = combineUserStatistics(allUserStats);
            }
                
        } else {
            // For individual users, calculate normally
            statistics = calculateStatisticsFromLocations(selectedUser, locationsData);
        }
        
        console.log("Calculated statistics:", statistics);
        
        // Update stats display
        const userCount = selectedUser === ALL_TEST_USERS ? 
            allUsers.filter(u => u.user_id !== ALL_TEST_USERS).length : 1;
        
        updateStatsDisplay({
            totalUsersEl: document.getElementById('total-users'),
            totalLocationsEl: document.getElementById('total-locations'),
            totalDistanceEl: document.getElementById('total-distance'),
            activeHoursEl: document.getElementById('active-hours')
        }, {
            totalUsers: userCount,
            totalLocations: statistics.total_locations,
            distanceKm: (statistics.distance_traveled_meters / 1000).toFixed(1),
            activeHours: Object.values(statistics.activity_hours).filter(count => count > 0).length
        });
        
    } catch (error) {
        console.error('Error fetching test data from database:', error);
    }
}

// Combine statistics from multiple users
function combineUserStatistics(userStatsList) {
    const combined = {
        user_id: ALL_TEST_USERS,
        total_locations: 0,
        distance_traveled_meters: 0,
        first_location_timestamp: Infinity,
        last_location_timestamp: 0,
        city_visits: {},
        common_stops: [],
        activity_hours: {}
    };
    
    // Initialize activity hours
    for (let hour = 0; hour < 24; hour++) {
        combined.activity_hours[hour] = 0;
    }
    
    // Combine all statistics
    for (const userStats of userStatsList) {
        combined.total_locations += userStats.total_locations;
        combined.distance_traveled_meters += userStats.distance_traveled_meters;
        
        if (userStats.first_location_timestamp) {
            combined.first_location_timestamp = Math.min(
                combined.first_location_timestamp, 
                userStats.first_location_timestamp
            );
        }
        
        if (userStats.last_location_timestamp) {
            combined.last_location_timestamp = Math.max(
                combined.last_location_timestamp, 
                userStats.last_location_timestamp
            );
        }
        
        // Combine city visits
        for (const city in userStats.city_visits) {
            combined.city_visits[city] = (combined.city_visits[city] || 0) + userStats.city_visits[city];
        }
        
        // Combine activity hours
        for (const hour in userStats.activity_hours) {
            combined.activity_hours[hour] += userStats.activity_hours[hour];
        }
        
        // Combine stops
        combined.common_stops.push(...(userStats.common_stops || []));
    }
    
    // Cluster nearby stops
    if (combined.common_stops.length > 0) {
        combined.common_stops = clusterNearbyStops(combined.common_stops);
    }
    
    // Handle edge case where no locations were found
    if (combined.first_location_timestamp === Infinity) {
        combined.first_location_timestamp = null;
    }
    
    return combined;
}

// Cluster nearby stops to avoid duplicates
function clusterNearbyStops(stops) {
    const clusterThreshold = 200; // meters
    const clusteredStops = [];
    
    for (const stop of stops) {
        let found = false;
        
        for (const cluster of clusteredStops) {
            const distance = calculateDistance(
                stop.latitude, stop.longitude,
                cluster.latitude, cluster.longitude
            );
            
            if (distance <= clusterThreshold) {
                // Merge stops
                cluster.visit_count += stop.visit_count;
                cluster.average_duration_minutes = 
                    (cluster.average_duration_minutes * (cluster.visit_count - stop.visit_count) + 
                     stop.average_duration_minutes * stop.visit_count) / cluster.visit_count;
                found = true;
                break;
            }
        }
        
        if (!found) {
            clusteredStops.push({...stop});
        }
    }
    
    // Sort and limit stops
    return clusteredStops
        .sort((a, b) => b.visit_count - a.visit_count)
        .slice(0, 20);
}

// Calculate statistics from filtered locations
function calculateStatisticsFromLocations(userId, locations) {
    const stats = {
        user_id: userId,
        total_locations: locations.length,
        distance_traveled_meters: 0,
        first_location_timestamp: null,
        last_location_timestamp: null,
        city_visits: {},
        common_stops: [],
        activity_hours: {}
    };
    
    if (locations.length === 0) return stats;
    
    // Sort locations by timestamp
    const sortedLocations = [...locations].sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate timestamps
    stats.first_location_timestamp = sortedLocations[0].timestamp;
    stats.last_location_timestamp = sortedLocations[sortedLocations.length - 1].timestamp;
    
    // Calculate distance
    for (let i = 1; i < sortedLocations.length; i++) {
        const prev = sortedLocations[i - 1];
        const curr = sortedLocations[i];
        stats.distance_traveled_meters += calculateDistance(
            prev.latitude, prev.longitude,
            curr.latitude, curr.longitude
        );
    }
    
    // Calculate activity hours
    for (let hour = 0; hour < 24; hour++) {
        stats.activity_hours[hour] = 0;
    }
    locations.forEach(loc => {
        const hour = new Date(loc.timestamp).getHours();
        stats.activity_hours[hour] = (stats.activity_hours[hour] || 0) + 1;
    });
    
    // Find stops with the same parameters as used for all users
    stats.common_stops = findStops(sortedLocations, 150, 5 * 60 * 1000, 20);
    
    // Calculate city visits
    stats.city_visits = calculateCityClusters(locations);
    
    return stats;
}

// Reset map display to default state
function resetMapDisplay() {
    console.log("Resetting map display");
    
    // Clear all map layers
    Object.values(mapLayers).forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
        
        if (typeof layer.clearLayers === 'function') {
            layer.clearLayers();
        }
    });
    
    // Remove any existing heatmap layer
    map.eachLayer(layer => {
        if (layer._heat) {
            map.removeLayer(layer);
        }
    });
    
    // Remove any existing legends and messages
    const elementsToRemove = document.querySelectorAll('.map-legend, .legend, .no-stops-message, .leaflet-heatmap-layer');
    elementsToRemove.forEach(el => el.remove());
    
    // Reset map mode to none
    mapMode = 'none';
    
    // Remove active state from all buttons
    heatMapBtn.classList.remove('active');
    pathMapBtn.classList.remove('active');
    stopsMapBtn.classList.remove('active');
    
    // Save the reset state
    saveStateToStorage();
}

// Make sure path button state is always correct
function updatePathButtonState() {
    // Disable path button for all users view
    if (selectedUser === ALL_TEST_USERS) {
        console.log("Disabling path button - all users view detected:", selectedUser);
        pathMapBtn.disabled = true;
        pathMapBtn.classList.add('disabled');
        pathMapBtn.title = "Path view not available when viewing all users";
        
        // If current mode is path, switch to heat
        if (mapMode === 'path') {
            mapMode = 'heat';
        }
    } else {
        console.log("Enabling path button - single user view:", selectedUser);
        pathMapBtn.disabled = false;
        pathMapBtn.classList.remove('disabled');
        pathMapBtn.title = "";
    }
}

// Helper function to check if current view is "all users"
function isAllUsersView() {
    return selectedUser === ALL_TEST_USERS;
}

// Restore state from localStorage
function restoreStateFromStorage() {
    // Restore selected user
    selectedUser = localStorage.getItem(STORAGE_KEY_SELECTED_USER) || null;
    console.log("Restored selected user from localStorage:", selectedUser);
    
    // Restore dates
    const savedStartDate = localStorage.getItem(STORAGE_KEY_START_DATE);
    const savedEndDate = localStorage.getItem(STORAGE_KEY_END_DATE);
    
    if (savedStartDate && savedEndDate) {
        startDateInput.value = savedStartDate;
        endDateInput.value = savedEndDate;
        console.log("Restored date range from localStorage:", savedStartDate, "to", savedEndDate);
    } else {
        setDefaultDateRange(startDateInput, endDateInput);
    }
    
    // Restore map mode, but use 'none' as default
    const savedMapMode = localStorage.getItem(STORAGE_KEY_MAP_MODE);
    if (savedMapMode && savedMapMode !== 'none') {
        mapMode = savedMapMode;
        console.log("Restored map mode from localStorage:", mapMode);
    } else {
        mapMode = 'none';
    }
}

// Save state to localStorage
function saveStateToStorage() {
    // Save selected user
    localStorage.setItem(STORAGE_KEY_SELECTED_USER, selectedUser || "");
    
    // Save dates
    localStorage.setItem(STORAGE_KEY_START_DATE, startDateInput.value);
    localStorage.setItem(STORAGE_KEY_END_DATE, endDateInput.value);
    
    // Save map mode
    localStorage.setItem(STORAGE_KEY_MAP_MODE, mapMode);
    
    console.log("Saved state to localStorage");
}

// Setup map button event listeners with improved behavior
function setupMapButtonListeners() {
    // Remove any existing listeners to prevent duplicates
    heatMapBtn.removeEventListener('click', handleHeatMapClick);
    pathMapBtn.removeEventListener('click', handlePathMapClick);
    stopsMapBtn.removeEventListener('click', handleStopsMapClick);
    
    // Add new listeners with event capture
    heatMapBtn.addEventListener('click', handleHeatMapClick);
    pathMapBtn.addEventListener('click', handlePathMapClick);
    stopsMapBtn.addEventListener('click', handleStopsMapClick);
}

// Handler functions for map buttons
function handleHeatMapClick(event) {
    window.event = event; // Store event for use in setMapMode
    setMapMode('heat', false); // Pass false to indicate this is NOT initial load
    saveStateToStorage();
}

function handlePathMapClick(event) {
    window.event = event;
    setMapMode('path', false);
    saveStateToStorage();
}

function handleStopsMapClick(event) {
    window.event = event;
    setMapMode('stops', false);
    saveStateToStorage();
}

// Setup Event Listeners for normal operation and test data
async function setupEventListeners() {
    // User select change
    userSelect.addEventListener('change', async () => {
        selectedUser = userSelect.value;
        saveStateToStorage();
        updatePathButtonState();
        resetMapDisplay(); // Reset map when user changes
        
        if (USE_TEST_DATA) {
            await fetchTestDataFromDatabase();
            updateUI();
        } else {
            fetchData();
        }
    });
    
    // Refresh button click
    refreshBtn.addEventListener('click', async () => {
        resetMapDisplay(); // Reset map on refresh
        
        if (USE_TEST_DATA) {
            // Reload users in case new ones were added
            await loadUsersAndSetupUI();
            
            // Restore selected user if it still exists
            if (selectedUser && allUsers.some(u => u.user_id === selectedUser)) {
                userSelect.value = selectedUser;
            } else {
                selectedUser = userSelect.value;
                saveStateToStorage();
            }
            
            await fetchTestDataFromDatabase();
            updateUI();
        } else {
            fetchData();
        }
    });
    
    // Date range changes
    startDateInput.addEventListener('change', async () => {
        saveStateToStorage();
        resetMapDisplay(); // Reset map when dates change
        
        if (USE_TEST_DATA) {
            await fetchTestDataFromDatabase();
            updateUI();
        } else {
            fetchData();
        }
    });
    
    endDateInput.addEventListener('change', async () => {
        saveStateToStorage();
        resetMapDisplay(); // Reset map when dates change
        
        if (USE_TEST_DATA) {
            await fetchTestDataFromDatabase();
            updateUI();
        } else {
            fetchData();
        }
    });
    
    // Set up map mode buttons with event capturing
    setupMapButtonListeners();
}

// Fixed setMapMode function to properly use date-filtered data
function setMapMode(mode, isInitialLoad = false) {
    console.log("Setting map mode:", mode, "Previous mode:", mapMode, "Initial load:", isInitialLoad);
    
    // Don't do anything for 'none' mode except clear the map
    if (mode === 'none') {
        resetMapDisplay();
        return;
    }
    
    // Remove any existing no-stops-message elements
    const noStopsMessages = document.querySelectorAll('.no-stops-message');
    noStopsMessages.forEach(el => el.remove());
    
    // Update path button state for all users view
    updatePathButtonState();
    
    // Check if trying to use path mode when disabled
    if (pathMapBtn.disabled && mode === 'path') {
        console.log("Path mode not available for all users selection");
        mode = 'heat';
        // Show alert message
        window.alert('Path view is not available when viewing all users');
    }
    
    // Determine if we should open the standalone heatmap
    let shouldOpenStandalone = false;
    
    if (mode === 'heat' && !isInitialLoad) {
        // Case 1: Switching from another mode to heat
        if (mapMode !== 'heat') {
            shouldOpenStandalone = true;
            console.log("Should open standalone: switching to heat from another mode");
        } 
        // Case 2: Reclicking the heat button when already active
        else if (window.event && window.event.target) {
            // Safely check parent nodes without causing errors
            const target = window.event.target;
            const isHeatButton = target === heatMapBtn || 
                                (target.parentNode && target.parentNode === heatMapBtn) ||
                                (target.parentNode && target.parentNode.parentNode && 
                                 target.parentNode.parentNode === heatMapBtn);
            
            if (isHeatButton) {
                shouldOpenStandalone = true;
                console.log("Should open standalone: re-clicking heat button");
            }
        }
        
        // Only check referrer if we're not reclicking the button
        const isFromHeatmap = document.referrer.indexOf('heatmap-standalone') !== -1;
        const preventReopen = sessionStorage.getItem('preventHeatmapOpen') === 'true';
        
        if (isFromHeatmap) {
            console.log("Coming from heatmap page. Will reset prevention flag.");
            sessionStorage.removeItem('preventHeatmapOpen');
        }
        
        // Only prevent if the flag is explicitly set
        if (preventReopen) {
            shouldOpenStandalone = false;
            console.log("Preventing standalone open: prevention flag is set");
            sessionStorage.removeItem('preventHeatmapOpen');
        }
    }
    
    // Update button states - don't apply active class on initial load
    if (!isInitialLoad) {
        updateMapModeButtons(heatMapBtn, pathMapBtn, stopsMapBtn, mode);
    } else {
        console.log("Skipping button highlighting on initial load");
        // Make sure no buttons are highlighted on initial load
        heatMapBtn.classList.remove('active');
        pathMapBtn.classList.remove('active');
        stopsMapBtn.classList.remove('active');
    }
    
    // Store the previous mode
    const prevMode = mapMode;
    mapMode = mode;
    
    // Open standalone heatmap if needed
    if (shouldOpenStandalone && USE_TEST_DATA) {
        // Add the selected user to the URL
        const userParam = selectedUser ? `?user=${encodeURIComponent(selectedUser)}` : '';
        const heatmapUrl = 'heatmap-standalone-db.html' + userParam;
        
        console.log("Opening standalone heatmap:", heatmapUrl);
        window.open(heatmapUrl, '_blank');
        return;
    }
    
    // Clear all map layers
    Object.values(mapLayers).forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
        
        if (typeof layer.clearLayers === 'function') {
            layer.clearLayers();
        }
    });
    
    // Remove any existing heatmap layer
    map.eachLayer(layer => {
        if (layer._heat) {
            map.removeLayer(layer);
        }
    });
    
    // Remove any existing legends
    const existingLegends = document.querySelectorAll('.map-legend, .legend');
    existingLegends.forEach(el => el.remove());
    
    // Remove any heatmap canvas elements
    const existingHeatmapElements = document.querySelectorAll('.leaflet-heatmap-layer');
    existingHeatmapElements.forEach(el => el.remove());
    
    console.log(`Switching from ${prevMode} to ${mode} mode`);
    
    // Use the already filtered locationsData (no additional filtering needed)
    console.log(`Using ${locationsData.length} locations (already filtered by date)`);
    
    // Now add the new layers based on selected mode
    if (mode === 'heat') {
        console.log("Rendering heatmap with", locationsData.length, "points");
        renderHeatMap(map, mapLayers.heatLayer, locationsData);
    } else if (mode === 'path') {
        if (locationsData.length < 2) {
            console.log("Not enough locations for path display");
            window.alert("Not enough locations in this date range to display a path");
            return;
        }
        
        mapLayers.pathLayer.addTo(map);
        mapLayers.markersLayer.addTo(map);
        
        console.log(`Rendering paths with ${locationsData.length} locations`);
        renderPathMap(map, mapLayers.pathLayer, mapLayers.markersLayer, locationsData);
    } else if (mode === 'stops') {
        mapLayers.stopsLayer.addTo(map);
        
        if (selectedUser === ALL_TEST_USERS) {
            console.log("Rendering stops for all users from filtered data");
            renderAverageStopsForAllUsers(map, mapLayers.stopsLayer, statistics);
        } else {
            console.log(`Rendering stops for single user with ${locationsData.length} locations`);
            
            if (statistics.common_stops && statistics.common_stops.length > 0) {
                renderStopsMap(map, mapLayers.stopsLayer, statistics.common_stops, locationsData);
            } else {
                console.log("No stops found in the selected date range");
                window.alert("No stops found in the selected date range");
            }
        }
    }
}

// Update UI
function updateUI() {
    // Check and update path button state
    updatePathButtonState();
    
    // Update map based on current mode - Pass true for isInitialLoad
    if (mapMode !== 'none') {
        setMapMode(mapMode, true);
    } else {
        // For 'none' mode, just ensure the map is empty
        resetMapDisplay();
    }
    
    // Update charts with filtered data
    updateActivityHoursChart(activityHoursChart, statistics.activity_hours);
    updateCityVisitsChart(cityVisitsChart, statistics.city_visits, locationsData);
    updateTimelineChart(timelineChart, locationsData);
    
    // Update stops list
    updateStopsList(stopsList, statistics.common_stops, (stop) => {
        map.setView([stop.latitude, stop.longitude], 16);
        setMapMode('stops');
    });
    
    // Hide loading indicators
    hideLoading();
    
    // Update connection status
    const statusIndicator = document.getElementById('connection-status');
    updateConnectionStatus(statusIndicator, USE_TEST_DATA ? 'Using dynamic data from database' : 'Connected', true);
}

// Fetch Data (for non-test mode)
async function fetchData() {
    showLoading();
    
    try {
        // Get date range
        const startTime = new Date(startDateInput.value).getTime();
        const endTime = new Date(endDateInput.value).getTime() + (24 * 60 * 60 * 1000 - 1);
        
        console.log(`Fetching data for date range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
        
        // Fetch locations
        locationsData = await fetchLocations(selectedUser, startTime, endTime);
        console.log(`Fetched ${locationsData.length} locations`);
        
        // Sort for consistent paths
        locationsData.sort((a, b) => a.timestamp - b.timestamp);
        
        // Calculate statistics from filtered locations
        if (selectedUser && selectedUser !== "") {
            statistics = calculateStatisticsFromLocations(selectedUser, locationsData);
            console.log("Calculated statistics from filtered data:", statistics);
            
            // Update stats display
            updateStatsDisplay({
                totalLocationsEl,
                totalDistanceEl,
                activeHoursEl
            }, {
                totalLocations: statistics.total_locations,
                distanceKm: (statistics.distance_traveled_meters / 1000).toFixed(1),
                activeHours: Object.values(statistics.activity_hours).filter(count => count > 0).length
            });
        } else {
            // Calculate global statistics
            calculateGlobalStatistics();
        }
        
        // Update UI
        updateUI();
    } catch (error) {
        console.error('Error fetching data:', error);
        hideLoading();
    }
}

// Calculate Global Statistics
function calculateGlobalStatistics() {
    const users = new Set();
    let totalDistance = 0;
    const activityHoursMap = {};
    
    // Initialize all hours to 0
    for (let hour = 0; hour < 24; hour++) {
        activityHoursMap[hour] = 0;
    }
    
    // Deduplicate locations
    const uniqueLocations = deduplicateLocations(locationsData);
    
    // Group locations by user for distance calculation
    const userLocations = {};
    
    for (const location of uniqueLocations) {
        users.add(location.user_id);
        
        if (!userLocations[location.user_id]) {
            userLocations[location.user_id] = [];
        }
        userLocations[location.user_id].push(location);
        
        // Count activity hours
        const hour = new Date(location.timestamp).getHours();
        activityHoursMap[hour] = (activityHoursMap[hour] || 0) + 1;
    }
    
    // Calculate distance for each user
    for (const userId in userLocations) {
        const locations = userLocations[userId].sort((a, b) => a.timestamp - b.timestamp);
        
        for (let i = 1; i < locations.length; i++) {
            const prev = locations[i - 1];
            const curr = locations[i];
            const distance = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
            totalDistance += distance;
        }
    }
    
    // Find common stops from locations
    const commonStops = findStops(uniqueLocations);
    
    // Update statistics object
    statistics = {
        user_id: ALL_TEST_USERS,
        total_locations: uniqueLocations.length,
        distance_traveled_meters: totalDistance,
        activity_hours: activityHoursMap,
        common_stops: commonStops
    };
    
    console.log("Calculated global statistics:", statistics);
    
    // Update UI stats
    updateStatsDisplay({
        totalUsersEl,
        totalLocationsEl,
        totalDistanceEl,
        activeHoursEl
    }, {
        totalUsers: users.size,
        totalLocations: uniqueLocations.length,
        distanceKm: (totalDistance / 1000).toFixed(1),
        activeHours: Object.values(activityHoursMap).filter(count => count > 0).length
    });
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);