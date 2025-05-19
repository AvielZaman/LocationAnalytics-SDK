// Dashboard/modules/charts.js
import { deduplicateLocations, calculateCityClusters } from './geoUtils.js';

// Chart instance storage
let chartInstances = {};

// Update Activity Hours Chart
const updateActivityHoursChart = (canvasElement, activityHours) => {
    // Clear existing chart if it exists
    if (chartInstances.activityHours) {
        chartInstances.activityHours.destroy();
    }
    
    // Check if we have activity hours data
    if (!activityHours) {
        console.warn("No activity hours data available for chart");
        return;
    }
    
    console.log("Updating activity hours chart with data:", activityHours);
    
    // Prepare data
    const labels = Array.from({length: 24}, (_, i) => `${i}:00`);
    const data = labels.map((_, i) => activityHours[i] || 0);
    
    // Create chart
    const ctx = canvasElement.getContext('2d');
    chartInstances.activityHours = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Activity by Hour',
                data: data,
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} locations`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Locations'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Hour'
                    }
                }
            }
        }
    });
    
    return chartInstances.activityHours;
};

// Update City Visits Chart
const updateCityVisitsChart = (canvasElement, cityVisits, locationsData) => {
    // Clear existing chart if it exists
    if (chartInstances.cityVisits) {
        chartInstances.cityVisits.destroy();
    }
    
    // Check if we have city visits data
    if (!cityVisits || Object.keys(cityVisits).length === 0) {
        // Since we don't have real geocoding, let's create mock city data
        if (!locationsData || locationsData.length === 0) {
            console.warn("No location data available for city visits chart");
            return;
        }
        
        console.log("Calculating city clusters from locations for chart");
        // Calculate city clusters from locations
        cityVisits = calculateCityClusters(locationsData);
    }
    
    console.log("Updating city visits chart with data:", cityVisits);
    
    // Get top 5 cities
    const cities = Object.entries(cityVisits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Prepare data
    const labels = cities.map(city => city[0]);
    const data = cities.map(city => city[1]);
    
    // Create chart
    const ctx = canvasElement.getContext('2d');
    chartInstances.cityVisits = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(155, 89, 182, 0.7)',
                    'rgba(241, 196, 15, 0.7)',
                    'rgba(231, 76, 60, 0.7)'
                ],
                borderColor: [
                    'rgba(52, 152, 219, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(155, 89, 182, 1)',
                    'rgba(241, 196, 15, 1)',
                    'rgba(231, 76, 60, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    return chartInstances.cityVisits;
};

// Update Timeline Chart
const updateTimelineChart = (canvasElement, locationsData) => {
    // Clear existing chart if it exists
    if (chartInstances.timeline) {
        chartInstances.timeline.destroy();
    }
    
    if (!locationsData || locationsData.length === 0) {
        console.warn("No location data available for timeline chart");
        return;
    }
    
    console.log("Updating timeline chart with", locationsData.length, "locations");
    
    // Deduplicate locations
    const uniqueLocations = deduplicateLocations(locationsData);
    
    // Group locations by day
    const locationsByDay = {};
    
    for (const location of uniqueLocations) {
        const date = new Date(location.timestamp);
        const dateString = date.toISOString().split('T')[0];
        
        if (!locationsByDay[dateString]) {
            locationsByDay[dateString] = [];
        }
        locationsByDay[dateString].push(location);
    }
    
    // Prepare data
    const dates = Object.keys(locationsByDay).sort();
    const counts = dates.map(date => locationsByDay[date].length);
    
    console.log("Timeline data:", { dates, counts });
    
    // Create chart
    const ctx = canvasElement.getContext('2d');
    chartInstances.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Number of Locations',
                data: counts,
                borderColor: 'rgba(46, 204, 113, 1)',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} locations`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Locations'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
    
    return chartInstances.timeline;
};

export {
    updateActivityHoursChart,
    updateCityVisitsChart,
    updateTimelineChart
};