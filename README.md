# Location Analytics SDK

A comprehensive location tracking and analytics solution that includes an Android SDK, backend server API, and analytics dashboard.

## Project Overview

The Location Analytics SDK provides developers with tools to track user location data in their Android applications, visualize movement patterns, and gain insights into user behavior. The project consists of three main components:

1. **Android SDK**: A library that Android developers can integrate into their apps to collect and transmit location data
2. **Backend API**: A Node.js/Express server that receives, processes, and stores location data
3. **Analytics Dashboard**: A web-based visualization tool for exploring collected location data

## Features

### Android SDK
- Easy integration with a builder pattern
- Automatic location tracking with customizable intervals
- Background tracking support
- Battery-efficient location collection
- Flexible user identification
- Automatic batching and retry mechanisms
- Real-time location queries
- User statistics retrieval

### Backend API
- RESTful API design
- Secure API key authentication
- Batch location data processing
- User statistics calculation
- Efficient MongoDB data storage
- Scalable architecture

### Analytics Dashboard
- Interactive heatmap visualization
- Path tracking visualization
- Common stops detection and display
- Activity hours analysis
- Visit frequency by location
- Timeline visualization
- Filter by date range and user
- Responsive design

## Dashboard Screenshots

### Analytics Overview
![Dashboard Analytics View](docs/images/dashboard-analytics.jpg)
*Dashboard showing activity hours, city visits, common stops, and timeline analytics*

### Heatmap Visualization
![Heatmap Visualization](docs/images/heatmap-view.jpg)
*Heatmap showing user movement patterns across Israel with activity intensity*

### Path Tracking
![Path Tracking](docs/images/path-tracking.jpg)
*Path tracking visualization showing user movement between locations*

### Stops Analysis
![Stops Visualization](docs/images/stops-view.jpg)
*Stops visualization showing frequently visited locations across Israel with the main statistics panel*

The system follows a client-server architecture:

1. **Android SDK** (Client):
   - Collects location data from device GPS
   - Batches data for efficient transmission
   - Communicates with backend via REST API
   - Provides local statistics and current location

2. **Backend Server** (Server):
   - Receives location data from SDK clients
   - Stores data in MongoDB (user collections)
   - Processes data for statistical analysis
   - Provides API endpoints for data retrieval
   - Serves the analytics dashboard

3. **Analytics Dashboard** (UI):
   - Visualizes location data using Leaflet maps
   - Displays statistical insights with Chart.js
   - Provides filtering and exploration tools
   - Responsive web interface

### Dashboard Access

The dashboard is served by the server at the root URL.

## Documentation

For complete documentation, see the [docs folder](DOCS.md).

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/location/batch` | POST | Send batch of locations |
| `/api/locations` | GET | Get locations by user ID and time range |
| `/api/users` | GET | Get all users |
| `/api/user/statistics` | GET | Get user statistics |

## SDK Reference

| Method | Description |
|--------|-------------|
| `setUserIdentifier(String userId)` | Sets the user identifier |
| `hasLocationPermission()` | Checks if location permissions are granted |
| `requestPermissions(Activity activity)` | Requests location permissions |
| `setTrackingInterval(int milliseconds)` | Sets the tracking interval |
| `startTracking()` | Starts location tracking |
| `stopTracking()` | Stops location tracking |
| `isTracking()` | Returns tracking status |
| `getCurrentLocation(LocationCallback callback)` | Gets current location |
| `getUserStatistics(ApiCallback<UserStatistics> callback)` | Gets user statistics |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Leaflet](https://leafletjs.com/) for map visualization
- [Chart.js](https://www.chartjs.org/) for statistical charts
- [Express](https://expressjs.com/) for the backend server
- [MongoDB](https://www.mongodb.com/) for database storage