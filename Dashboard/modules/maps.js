// Dashboard/modules/maps.js
import { deduplicateLocations, findStops, calculateDistance } from './geoUtils.js';

// Store heatmap layer reference globally to avoid removal issues
let currentHeatLayer = null;

// Initialize Map
const initializeMap = (mapContainer, defaultCenter = [32.0853, 34.7818], defaultZoom = 13) => {
    // Create map instance
    const map = L.map(mapContainer).setView(defaultCenter, defaultZoom);
    
    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Initialize layers
    const layers = {
        heatLayer: L.layerGroup(),
        pathLayer: L.layerGroup(),
        stopsLayer: L.layerGroup(),
        markersLayer: L.layerGroup()
    };
    
    return { map, layers };
};

// Render Heat Map with weather forecast-like wave effect
const renderHeatMap = (map, heatLayer, locationsData) => {
    console.log("Rendering heat map with", locationsData?.length || 0, "points");
    
    if (!locationsData || locationsData.length === 0) {
        console.warn("No location data available for heatmap");
        return;
    }
    
    // Add loading indicator
    const mapContainer = map.getContainer();
    let loadingIndicator = mapContainer.querySelector('.map-loading');
    
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'map-loading';
        loadingIndicator.innerHTML = '<div class="spinner"></div> Generating heatmap...';
        mapContainer.appendChild(loadingIndicator);
    }
    
    // Clear any existing heatmap layers
    map.eachLayer(layer => {
        if (layer._heat) {
            map.removeLayer(layer);
        }
    });
    
    // Remove any existing Leaflet heatmap elements
    const existingHeatmapElements = document.querySelectorAll('.leaflet-heatmap-layer');
    existingHeatmapElements.forEach(el => el.remove());
    
    try {
        // Deduplicate and sort locations to enhance the wave effect
        const uniqueLocations = {};
        locationsData.forEach(loc => {
            if (loc && loc.latitude && loc.longitude) {
                // Create a key with reduced precision for clustering
                const key = `${parseFloat(loc.latitude).toFixed(4)},${parseFloat(loc.longitude).toFixed(4)}`;
                if (!uniqueLocations[key]) {
                    uniqueLocations[key] = {
                        lat: parseFloat(loc.latitude),
                        lng: parseFloat(loc.longitude),
                        count: 0
                    };
                }
                uniqueLocations[key].count++;
            }
        });
        
        // Convert to array and apply wave-like intensity variation
        const heatData = Object.values(uniqueLocations).map(loc => {
            // Apply non-linear scaling to enhance visualization
            let intensity = Math.min(25, 5 + Math.sqrt(loc.count) * 3);
            
            // Add small random variations to create more organic look
            const variation = (Math.random() * 0.3) + 0.85; // 0.85 to 1.15 multiplier
            intensity *= variation;
            
            return [loc.lat, loc.lng, intensity];
        });
        
        console.log(`Prepared ${heatData.length} heatmap points with wave-like effect`);
        
        if (heatData.length === 0) {
            if (loadingIndicator) loadingIndicator.remove();
            return;
        }
        
        // Calculate bounds for the data
        const points = heatData.map(point => [point[0], point[1]]);
        const bounds = L.latLngBounds(points);
        
        // Added a small delay before creating heatmap to allow DOM to update
        setTimeout(() => {
            try {
                // Create heatmap with weather forecast-style settings
                const heat = L.heatLayer(heatData, {
                    radius: 35,          // Increased for more overlap and blending
                    blur: 40,            // Increased for smoother transitions
                    maxZoom: 18,
                    max: 0.6,            // Adjusted to normalize color distribution
                    minOpacity: 0.4,     // Increased minimum opacity
                    gradient: {          // Modified gradient for weather-like appearance
                        0.0: 'rgba(0, 0, 255, 0.7)',    // More transparent blue
                        0.2: 'rgba(0, 128, 255, 0.75)', // Light blue
                        0.4: 'rgba(0, 255, 255, 0.8)',  // Cyan
                        0.6: 'rgba(0, 255, 0, 0.85)',   // Green
                        0.7: 'rgba(255, 255, 0, 0.9)',  // Yellow
                        0.8: 'rgba(255, 128, 0, 0.95)', // Orange
                        1.0: 'rgba(255, 0, 0, 1.0)'     // Solid red
                    }
                });
                
                // Store current heat layer for later removal
                currentHeatLayer = heat;
                
                // Add directly to map (not to a layer group)
                heat.addTo(map);
                console.log("Weather-style heatmap added to map");
                
                // Set zoom and bounds
                map.fitBounds(bounds, { padding: [50, 50] });
                
                // Create a weather-style legend
                createWeatherLegend(map);
                
                // Fix canvas warning
                setTimeout(() => {
                    const canvases = document.querySelectorAll('canvas');
                    canvases.forEach(canvas => {
                        canvas.willReadFrequently = true;
                    });
                }, 100);
                
                // Additional debug to help identify rendering issues
                console.log("Heat layer created:", heat);
                console.log("Heat layer added to map:", map.hasLayer(heat));
                
                // Extra check to see if _heat property exists on the layer
                map.eachLayer(layer => {
                    if (layer._heat) {
                        console.log("Found heat layer in map layers:", layer);
                    }
                });
            } catch (err) {
                console.error("Error in delayed heatmap creation:", err);
            } finally {
                if (loadingIndicator) loadingIndicator.remove();
            }
        }, 200);  // Small delay to ensure DOM is ready
    } catch (error) {
        console.error("Error creating heatmap:", error);
        if (loadingIndicator) loadingIndicator.remove();
    }
};

// Create a weather forecast style legend
const createWeatherLegend = (map) => {
    // Remove existing legend if present
    const existingLegend = document.querySelector('.legend');
    if (existingLegend) {
        existingLegend.remove();
    }

    // Create legend container
    const legend = document.createElement('div');
    legend.className = 'legend';
    legend.style.cssText = `
        position: absolute;
        bottom: 30px;
        right: 10px;
        background: white;
        padding: 15px;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0,0,0,0.2);
        z-index: 1000;
        width: 250px;
    `;
    
    legend.innerHTML = `
        <h4 style="margin: 0 0 10px 0; font-size: 14px; text-align: center;">Activity Intensity</h4>
        <div class="gradient-bar" style="height: 15px; width: 100%; margin-bottom: 8px; border-radius: 4px; background: linear-gradient(to right, 
            rgba(0, 0, 255, 0.7) 0%, 
            rgba(0, 128, 255, 0.75) 20%,
            rgba(0, 255, 255, 0.8) 40%,
            rgba(0, 255, 0, 0.85) 60%,
            rgba(255, 255, 0, 0.9) 70%,
            rgba(255, 128, 0, 0.95) 80%,
            rgba(255, 0, 0, 1.0) 100%);"></div>
        <div class="labels" style="display: flex; justify-content: space-between; font-size: 12px; color: #555;">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
        </div>
    `;

    // Add legend to map container
    map.getContainer().appendChild(legend);

    return legend;
};


// ORIGINAL Render Path Map - Keeping the exact original logic
const renderPathMap = (map, pathLayer, markersLayer, locationsData) => {
    if (!locationsData || locationsData.length === 0) return;
    
    // First, safely remove any existing heatmap layer
    if (currentHeatLayer) {
        try {
            map.removeLayer(currentHeatLayer);
            currentHeatLayer = null;
        } catch (e) {
            console.warn("Error removing existing heat layer:", e);
        }
    }
    
    // Clear previous layers
    pathLayer.clearLayers();
    markersLayer.clearLayers();
    
    // Group locations by user, but deduplicate first
    const userPaths = {};
    const uniqueLocations = deduplicateLocations(locationsData);
    
    for (const location of uniqueLocations) {
        if (!userPaths[location.user_id]) {
            userPaths[location.user_id] = [];
        }
        userPaths[location.user_id].push(location);
    }
    
    // Sort each user's locations by timestamp
    for (const userId in userPaths) {
        userPaths[userId].sort((a, b) => a.timestamp - b.timestamp);
    }
    
    // Create a path for each user
    const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6'];
    let colorIndex = 0;
    const allPoints = [];
    
    for (const userId in userPaths) {
        const userLocations = userPaths[userId];
        const pathPoints = userLocations.map(loc => [loc.latitude, loc.longitude]);
        
        // Skip if not enough points
        if (pathPoints.length < 2) continue;
        
        // Save all points for bounds calculation
        pathPoints.forEach(point => allPoints.push(point));
        
        // Create and style polyline
        const color = colors[colorIndex % colors.length];
        colorIndex++;
        
        const polyline = L.polyline(pathPoints, {
            color: color,
            weight: 5,           // Increased from 3
            opacity: 0.9,        // Increased from 0.7
            smoothFactor: 1
        }).addTo(pathLayer);
        
        // Add start and end markers
        addPathEndpoints(markersLayer, userLocations, userId, color);
    }
    
    // Fit bounds to all paths
    if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds);
    }
};

// ORIGINAL Helper function to add start/end markers to paths
const addPathEndpoints = (markersLayer, locations, userId, color) => {
    const startLocation = locations[0];
    const endLocation = locations[locations.length - 1];
    
    // Create marker icon
    const createMarkerIcon = () => L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [15, 15]
    });
    
    // Start marker
    const startMarker = L.marker([startLocation.latitude, startLocation.longitude], {
        icon: createMarkerIcon()
    }).addTo(markersLayer);
    
    startMarker.bindPopup(`
        <strong>${userId}</strong><br>
        Start: ${new Date(startLocation.timestamp).toLocaleString()}<br>
        Accuracy: ${startLocation.accuracy ? startLocation.accuracy.toFixed(1) + ' meters' : 'N/A'}
    `);
    
    // End marker
    const endMarker = L.marker([endLocation.latitude, endLocation.longitude], {
        icon: createMarkerIcon()
    }).addTo(markersLayer);
    
    endMarker.bindPopup(`
        <strong>${userId}</strong><br>
        End: ${new Date(endLocation.timestamp).toLocaleString()}<br>
        Accuracy: ${endLocation.accuracy ? endLocation.accuracy.toFixed(1) + ' meters' : 'N/A'}
    `);
};

// Render Stops Map
const renderStopsMap = (map, stopsLayer, stops, locationsData) => {
    console.log("Rendering stops map with", stops?.length || 0, "stops");
    
    // First, safely remove any existing heatmap layer
    if (currentHeatLayer) {
        try {
            map.removeLayer(currentHeatLayer);
            currentHeatLayer = null;
        } catch (e) {
            console.warn("Error removing existing heat layer:", e);
        }
    }
    
    // Clear previous layers
    stopsLayer.clearLayers();
    
    // Remove any existing "no stops" message
    const existingNoStopsMessages = document.querySelectorAll('.no-stops-message');
    existingNoStopsMessages.forEach(el => el.remove());
    
    // Ensure we have stops data
    if (!stops || stops.length === 0) {
        // If no stops provided, try to calculate them
        if (locationsData && locationsData.length > 0) {
            console.log("No stops provided, calculating from locations data");
            stops = findStops(locationsData, 150, 5 * 60 * 1000, 20);
            console.log(`Calculated ${stops.length} stops from locations data`);
        }
    }
    
    if (!stops || stops.length === 0) {
        console.warn("No stops found to display");
        // Add a message on the map
        const noStopsMessage = document.createElement('div');
        noStopsMessage.className = 'no-stops-message';
        noStopsMessage.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.9);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            text-align: center;
        `;
        noStopsMessage.innerHTML = 'No stops found in the selected date range';
        map.getContainer().appendChild(noStopsMessage);
        return;
    }
    
    console.log(`Displaying ${stops.length} stops on map`);
    const stopPoints = [];
    
    // Display stops on map with improved styling
    for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        stopPoints.push([stop.latitude, stop.longitude]);
        
        // Create a marker with size based on visit count
        const maxVisits = Math.max(...stops.map(s => s.visit_count));
        const relativeSize = stop.visit_count / maxVisits;
        const markerSize = 30 + relativeSize * 20; // 30-50px
        
        const marker = L.marker([stop.latitude, stop.longitude], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="
                    background-color: #e74c3c; 
                    width: ${markerSize}px; 
                    height: ${markerSize}px; 
                    border-radius: 50%; 
                    color: white; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-weight: bold; 
                    font-size: ${14 + relativeSize * 4}px; 
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                ">${i + 1}</div>`,
                iconSize: [markerSize, markerSize]
            })
        }).addTo(stopsLayer);
        
        // Add informative popup
        marker.bindPopup(`
            <strong>${stop.name || 'Stop ' + (i + 1)}</strong><br>
            <span style="color: #666;">Visits:</span> <strong>${stop.visit_count}</strong><br>
            <span style="color: #666;">Average time:</span> <strong>${stop.average_duration_minutes.toFixed(0)} min</strong><br>
            <span style="color: #666;">Coordinates:</span> ${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)}
        `);
    }
    
    // Fit map to stops with padding
    if (stopPoints.length > 0) {
        const bounds = L.latLngBounds(stopPoints);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
};

// Function to render average stops for all users with MUCH larger circles
const renderAverageStopsForAllUsers = (map, stopsLayer, statistics) => {
    // Clear previous layers
    stopsLayer.clearLayers();
    
    console.log("Rendering average stop locations for all users");
    
    if (!statistics || !statistics.common_stops || statistics.common_stops.length === 0) {
        console.warn("No stop data available for any users");
        return;
    }
    
    const allStops = statistics.common_stops;
    
    // Cluster nearby stops using a smaller threshold
    const clusterThresholdMeters = 150; // Reduced from 200m to 150m for better clustering
    const stopClusters = [];
    
    // Add each stop to an existing cluster or create a new one
    for (const stop of allStops) {
        if (!stop) continue;
        
        let addedToCluster = false;
        
        for (const cluster of stopClusters) {
            const distance = calculateDistance(
                cluster.center.latitude, 
                cluster.center.longitude,
                stop.latitude, 
                stop.longitude
            );
            
            if (distance <= clusterThresholdMeters) {
                // Add to this cluster
                cluster.stops.push(stop);
                // Update center (weighted average)
                const n = cluster.stops.length;
                cluster.center.latitude = (cluster.center.latitude * (n - 1) + stop.latitude) / n;
                cluster.center.longitude = (cluster.center.longitude * (n - 1) + stop.longitude) / n;
                // Update total visits
                cluster.totalVisits += stop.visit_count;
                // Update average duration
                cluster.totalDuration += stop.visit_count * stop.average_duration_minutes;
                addedToCluster = true;
                break;
            }
        }
        
        if (!addedToCluster) {
            // Create new cluster
            stopClusters.push({
                center: {
                    latitude: stop.latitude,
                    longitude: stop.longitude
                },
                stops: [stop],
                totalVisits: stop.visit_count,
                totalDuration: stop.visit_count * stop.average_duration_minutes,
                userIds: new Set([stop.user_id])
            });
        }
    }
    
    // Calculate final metrics for each cluster
    stopClusters.forEach(cluster => {
        cluster.avgDuration = cluster.totalDuration / cluster.totalVisits;
        cluster.userIds = new Set(cluster.stops.map(stop => stop.user_id || ''));
        
        // Attempt to find the most common name
        const nameCount = {};
        cluster.stops.forEach(stop => {
            if (stop.name) {
                nameCount[stop.name] = (nameCount[stop.name] || 0) + stop.visit_count;
            }
        });
        
        // Find name with highest count
        let maxCount = 0;
        let mostCommonName = null;
        
        for (const [name, count] of Object.entries(nameCount)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommonName = name;
            }
        }
        
        cluster.name = mostCommonName || `Cluster (${cluster.center.latitude.toFixed(4)}, ${cluster.center.longitude.toFixed(4)})`;
    });
    
    // Sort clusters by total visits
    stopClusters.sort((a, b) => b.totalVisits - a.totalVisits);
    
    // Display clusters on map
    const clusterPoints = [];
    const maxVisits = stopClusters.length > 0 ? stopClusters[0].totalVisits : 1;
    
    stopClusters.forEach((cluster, index) => {
        if (index >= 20) return; // Show more clusters (20 instead of 15)
        
        clusterPoints.push([cluster.center.latitude, cluster.center.longitude]);
        
        // ENORMOUSLY LARGER CIRCLES: Scale radius based on visit count (min 500, max 2000 meters)
        const relativeSize = cluster.totalVisits / maxVisits;
        const radius = 500 + relativeSize * 1500; // Dramatically increased sizes
        
        // Create circle with size based on popularity
        const circle = L.circle([cluster.center.latitude, cluster.center.longitude], {
            radius: radius,
            color: '#e74c3c',
            fillColor: '#e74c3c',
            fillOpacity: 0.6,
            weight: 3  // Increased outline weight
        }).addTo(stopsLayer);
        
        // Add popup
        circle.bindPopup(`
            <strong>${cluster.name}</strong><br>
            Total visits: ${cluster.totalVisits}<br>
            Average duration: ${cluster.avgDuration.toFixed(0)} minutes<br>
            Users: ${cluster.userIds.size} users visited
        `);
        
        // No number labels as per user request
    });
    
    // Fit map to clusters with extra padding
    if (clusterPoints.length > 0) {
        const bounds = L.latLngBounds(clusterPoints);
        map.fitBounds(bounds, { padding: [100, 100] }); // Increased padding
    }
};

export {
    initializeMap,
    renderHeatMap,
    renderPathMap,
    renderStopsMap,
    renderAverageStopsForAllUsers
};