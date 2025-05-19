// Dashboard/modules/ui.js

// Format utilities
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

// Create status indicator for connection status
const createStatusIndicator = () => {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'connection-status';
    statusDiv.style.position = 'fixed';
    statusDiv.style.bottom = '10px';
    statusDiv.style.right = '10px';
    statusDiv.style.padding = '5px 10px';
    statusDiv.style.borderRadius = '5px';
    statusDiv.style.fontSize = '12px';
    statusDiv.style.zIndex = '1000';
    document.body.appendChild(statusDiv);
    
    return statusDiv;
};

// Update connection status
const updateConnectionStatus = (statusDiv, message, isConnected) => {
    if (statusDiv) {
        statusDiv.textContent = message;
        if (isConnected !== null) {
            statusDiv.style.backgroundColor = isConnected ? 'rgba(46, 204, 113, 0.8)' : 'rgba(231, 76, 60, 0.8)';
            statusDiv.style.color = 'white';
        } else {
            statusDiv.style.backgroundColor = 'rgba(52, 152, 219, 0.8)';
            statusDiv.style.color = 'white';
        }
    }
};

// Show loading indicators
const showLoading = () => {
    document.querySelectorAll('.loading-indicator').forEach(el => {
        el.style.display = 'block';
    });
};

// Hide loading indicators
const hideLoading = () => {
    document.querySelectorAll('.loading-indicator').forEach(el => {
        el.style.display = 'none';
    });
};

// Set default date range to last 7 days (current week)
const setDefaultDateRange = (startInput, endInput) => {
    const endDate = new Date(); // Today
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7); // 7 days ago
    
    // Format dates to YYYY-MM-DD
    startInput.value = formatDate(startDate);
    endInput.value = formatDate(endDate);
    
    console.log(`Setting default date range: ${formatDate(startDate)} to ${formatDate(endDate)}`);
};

// Populate user select dropdown
const populateUserSelect = (selectElement, users, useDisplayName = false) => {
    selectElement.innerHTML = '';
    
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.user_id;
        
        // Use display_name if available, otherwise use user_id
        option.textContent = useDisplayName && user.display_name ? 
            user.display_name : user.user_id;
            
        selectElement.appendChild(option);
    });
};

// Update stats display
const updateStatsDisplay = (elements, statistics) => {
    const { totalUsersEl, totalLocationsEl, totalDistanceEl, activeHoursEl } = elements;
    
    if (totalUsersEl && statistics.totalUsers !== undefined) {
        totalUsersEl.textContent = statistics.totalUsers;
    }
    
    if (totalLocationsEl && statistics.totalLocations !== undefined) {
        totalLocationsEl.textContent = statistics.totalLocations;
    }
    
    if (totalDistanceEl && statistics.distanceKm !== undefined) {
        totalDistanceEl.textContent = statistics.distanceKm;
    }
    
    if (activeHoursEl && statistics.activeHours !== undefined) {
        activeHoursEl.textContent = statistics.activeHours;
    }
};

// Update stops list in UI
const updateStopsList = (stopsListElement, stops, onStopClick) => {
    // Clear current list
    stopsListElement.innerHTML = '';
    
    if (!stops || stops.length === 0) {
        stopsListElement.innerHTML = '<div class="loading-indicator">No stop data available</div>';
        return;
    }
    
    // Add stops to list
    stops.forEach((stop, index) => {
        const stopItem = document.createElement('div');
        stopItem.className = 'stop-item';
        stopItem.innerHTML = `
            <div class="stop-icon">${index + 1}</div>
            <div class="stop-details">
                <div class="stop-name">${stop.name || 'Stop ' + (index + 1)}</div>
                <div class="stop-stats">
                    <span><i class="fas fa-repeat"></i> ${stop.visit_count} visits</span>
                    <span><i class="fas fa-clock"></i> ${stop.average_duration_minutes.toFixed(0)} minutes</span>
                </div>
            </div>
        `;
        
        if (onStopClick) {
            stopItem.addEventListener('click', () => onStopClick(stop, index));
        }
        
        stopsListElement.appendChild(stopItem);
    });
};

// Toggle active state for map mode buttons
const updateMapModeButtons = (heatBtn, pathBtn, stopsBtn, activeMode) => {
    heatBtn.classList.toggle('active', activeMode === 'heat');
    pathBtn.classList.toggle('active', activeMode === 'path');
    stopsBtn.classList.toggle('active', activeMode === 'stops');
};

export {
    formatDate,
    createStatusIndicator,
    updateConnectionStatus,
    showLoading,
    hideLoading,
    setDefaultDateRange,
    populateUserSelect,
    updateStatsDisplay,
    updateStopsList,
    updateMapModeButtons
};