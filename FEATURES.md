# NafasLokal - Feature Documentation

## Overview

NafasLokal is a comprehensive air quality monitoring and health management platform for Malaysian cities. This document describes all implemented features and their functionality.

---

## 🏠 Landing Page (`/`)

### Description
The landing page introduces NafasLokal with a modern, clean design that communicates the app's value proposition.

### Features
- **Hero Section**: Engaging headline with call-to-action buttons
- **Three Pillars**: Visual representation of key benefits
  - Cut exposure on KL commutes
  - Rewards for smart choices
  - Health-first design
- **How It Works**: Step-by-step guide (Check, Plan, Log)
- **Authentication Integration**: Dynamic buttons based on login state
- **Responsive Design**: Optimized for mobile and desktop

### Technical Details
- File: `src/app/page.tsx`
- Uses: Next.js App Router, Tailwind CSS animations
- Authentication: AuthContext integration

---

## 📊 Dashboard (`/dashboard`)

### Description
The main operational hub displaying real-time air quality data with interactive visualizations.

### Features

#### 1. Real-Time Air Quality Display
- **Multi-source Data Fusion**: Combines data from DOE, WAQI, and OpenAQ
- **AQI Score**: Overall air quality index with color coding
- **Pollutant Breakdown**: Individual readings for PM2.5, PM10, NO₂, CO, O₃, SO₂
- **Risk Level Indicator**: Low/Moderate/High with visual badges
- **Data Source Attribution**: Shows which API provided the data

#### 2. Interactive Map
- **Leaflet-based Map**: Full-screen interactive mapping
- **Heatmap Layer**: Visual pollution density overlay
- **Station Markers**: Clickable markers for AQ stations
- **Zoom Controls**: Custom zoom with radius calculation
- **Click-to-Query**: Click anywhere to get local air quality

#### 3. Location Management
- **Auto-detection**: Uses browser geolocation API
- **Manual Input**: Search for any location
- **Fallback**: Defaults to Kuala Lumpur if location unavailable
- **Radius Adjustment**: Configure search radius (1-50km)

#### 4. Exposure Tracking
- **Log Exposures**: Record current air quality exposure
- **Transport Mode**: Track by walking, cycling, transit, or driving
- **Points System**: Earn points for healthy choices
- **Streak Counter**: Track consecutive low-exposure days

#### 5. Auto-Refresh
- **Configurable Interval**: 30s to 5 minutes
- **Play/Pause Control**: User can control auto-refresh
- **Visual Countdown**: Shows time until next refresh

#### 6. Trend Analysis
- **7-Day Trends**: Historical exposure chart
- **Average Scores**: Daily exposure averages
- **Visual Charts**: Line graphs with data points

#### 7. AI Chat Widget
- **Floating Chat Button**: Always accessible
- **Real-time AI Responses**: Powered by OpenAI/GPT
- **Context-Aware**: Includes current air quality data
- **Health Recommendations**: Personalized advice

#### 8. Healthcare Finder
- **Nearby Facilities**: Find hospitals and clinics
- **Distance Calculation**: Shows distance from current location
- **Contact Information**: Phone numbers and addresses

### Technical Details
- File: `src/app/dashboard/page.tsx`
- Size: ~1400 lines
- Key Services: airQualityService, locationService
- State Management: React hooks, Convex real-time
- Map: Leaflet with react-leaflet

---

## 🤖 AI Health Page (`/ai-health`)

### Description
AI-powered health predictions and personalized recommendations based on air quality exposure and health profile.

### Features

#### 1. Health Profile Setup
- **Personal Information**: Age group, gender
- **Respiratory Conditions**: Asthma, COPD, allergies, etc.
- **Lifestyle Factors**: Activity level, outdoor exposure
- **Environmental Factors**: Lives near traffic, has air purifier
- **Health History**: Heart conditions, pregnancy, medications

#### 2. AI Health Score
- **Overall Score**: 0-100 health score
- **Real-time Updates**: Based on current air quality
- **Color-coded Display**: Visual health status

#### 3. Pollutant Predictions
- **24-Hour Forecast**: Predicted levels for next day
- **Trend Indicators**: Up/Down/Stable arrows
- **Pollutant Coverage**: PM2.5, NO₂, O₃, CO
- **Risk Level**: Per-pollutant risk assessment

#### 4. Health Insights
- **AI-Generated Tips**: Personalized recommendations
- **Warning Alerts**: High-risk period notifications
- **Achievement Recognition**: Health milestones
- **Actionable Advice**: Specific steps to take

#### 5. Vulnerable Group Advisories
- **Targeted Groups**: Children, Elderly, Pregnant, Respiratory
- **Risk Assessment**: Per-group risk levels
- **Specific Recommendations**: Tailored advice for each group

#### 6. Model Confidence
- **Accuracy Metrics**: Shows AI model confidence
- **Data Points**: Number of readings used
- **Last Updated**: Timestamp of predictions

### Technical Details
- File: `src/app/ai-health/page.tsx`
- Size: ~885 lines
- API: `/api/ai-health` endpoint
- AI: OpenAI integration for predictions
- Storage: Convex for health profiles

---

## 🎮 Gamification Page (`/gamification`)

### Description
BreathQuest gamification system to incentivize healthy air quality behaviors.

### Features

#### 1. User Stats Display
- **Total XP**: Cumulative experience points
- **Current Level**: Tier progression
- **Current Streak**: Consecutive active days
- **Challenges Completed**: Total achievements

#### 2. Challenge System
- **Daily Challenges**: Short-term goals
  - Morning Air Scout: Check AQ before 9 AM
  - Peak Pollution Avoider: Stay indoors during peaks
- **Weekly Challenges**: Medium-term goals
  - Clean Route Champion: Choose low-pollution routes
  - Transit Hero: Use public transit on high-pollution days
- **Achievements**: Long-term milestones
  - Health Guardian: 7-day low-exposure streak
  - Air Quality Analyst: Log 20 different locations

#### 3. Progress Tracking
- **Progress Bars**: Visual completion status
- **XP Rewards**: Points per challenge
- **Lock States**: Show locked vs unlocked challenges

#### 4. Badge Collection
- **Early Adopter**: First users
- **Clean Commuter**: Transit achievements
- **Health Guardian**: Streak milestones
- **Air Scholar**: Data contributions
- **Community Champion**: Social achievements

#### 5. Leaderboard
- **Top 10 Display**: Highest scoring users
- **Current User Position**: Personal ranking
- **XP Display**: Points comparison

### Technical Details
- File: `src/app/gamification/page.tsx`
- Size: ~446 lines
- Mock Data: Currently uses static data for demo
- Future: Will integrate with Convex for persistence

---

## 👤 Registration Page (`/register`)

### Description
User registration and authentication system.

### Features

#### 1. Registration Form
- **Email Input**: Email validation
- **Password Input**: Secure password field
- **Name Input**: Display name
- **Terms Acceptance**: Privacy policy acknowledgment

#### 2. Authentication
- **Secure Hashing**: Password hashing (SHA-256 with salt)
- **Session Management**: Convex session tokens
- **Persistent Login**: Remember user sessions

#### 3. Error Handling
- **Validation Messages**: Field-specific errors
- **Duplicate Email Check**: Prevents duplicate accounts
- **Network Error Handling**: Graceful failures

### Technical Details
- File: `src/app/register/page.tsx`
- Auth: Custom authentication with Convex
- Storage: User data in Convex database

---

## 🗺️ Map Components

### AirQualityMap (`/components/map/AirQualityMap.tsx`)

#### Features
- **Base Map**: OpenStreetMap tiles
- **Marker Layer**: AQ station markers with popups
- **Heatmap Layer**: Color-coded pollution overlay
- **Click Handler**: Query air quality at any point
- **Zoom Handler**: Adjust search radius on zoom
- **Data Source Indicator**: Show active data source

### HeatmapLayer (`/components/map/HeatmapLayer.tsx`)

#### Features
- **Leaflet.heat Integration**: Smooth heatmap rendering
- **Dynamic Updates**: Real-time data updates
- **Color Gradient**: Green to red based on AQI
- **Intensity Scaling**: Based on pollutant levels

### ZoomControl (`/components/map/ZoomControl.tsx`)

#### Features
- **Custom Buttons**: Styled zoom controls
- **Radius Display**: Shows search radius
- **Keyboard Support**: Accessible controls

---

## 💬 Chat Components

### ChatWidget (`/components/chat/ChatWidget.tsx`)

#### Features
- **Floating Button**: Always visible on dashboard
- **Expandable Panel**: Full chat interface
- **Message History**: Scrollable conversation
- **Quick Actions**: Pre-defined prompts
- **Typing Indicator**: Shows AI is responding
- **Markdown Support**: Formatted responses

### ChatContext (`/contexts/ChatContext.tsx`)

#### Features
- **State Management**: Chat message store
- **Session Tracking**: Unique session IDs
- **Air Quality Context**: Injects current AQ data
- **Health Profile Context**: Uses user health data

---

## 🏥 Healthcare Components

### HealthcareFinder (`/components/healthcare/HealthcareFinder.tsx`)

#### Features
- **Location Search**: Find nearby facilities
- **Distance Sorting**: Closest first
- **Facility Types**: Hospitals, clinics, pharmacies
- **Contact Info**: Phone, address, hours
- **Map Integration**: View on map

---

## 📈 Analytics Components

### AirQualityComparison (`/components/analytics/AirQualityComparison.tsx`)

#### Features
- **Time Period Selection**: 24h, 7d, 30d
- **Chart Visualization**: Line and bar charts
- **Data Comparison**: Compare locations
- **Export Options**: Download data

---

## 🔌 API Routes

### `/api/air-quality`
- **Method**: GET
- **Purpose**: Fetch air quality by coordinates
- **Params**: lat, lng, radius

### `/api/ai-health`
- **Method**: POST
- **Purpose**: Get AI health predictions
- **Body**: location, healthProfile, timeframe

### `/api/chat`
- **Method**: POST
- **Purpose**: AI chatbot interaction
- **Body**: message, sessionId, context

### `/api/healthcare`
- **Method**: GET
- **Purpose**: Find nearby healthcare
- **Params**: lat, lng, radius, type

### `/api/waqi`
- **Method**: GET
- **Purpose**: WAQI API proxy
- **Params**: lat, lng

### `/api/openaq`
- **Method**: GET
- **Purpose**: OpenAQ API proxy
- **Params**: lat, lng, radius

### `/api/doe`
- **Method**: GET
- **Purpose**: DOE Malaysia API proxy
- **Params**: bounds

### `/api/health`
- **Method**: GET
- **Purpose**: Application health check
- **Response**: { status: "ok" }

---

## 🗄️ Database Schema (Convex)

### Tables

#### users
- `email`: User email (unique)
- `name`: Display name
- `passwordHash`: Hashed password
- `createdAt`: Registration timestamp

#### sessions
- `userId`: Reference to user
- `token`: Session token
- `expiresAt`: Expiration timestamp

#### profiles
- `userKey`: User identifier
- `nickname`: Display name
- `homeCity`: Default city
- `points`: Gamification points
- `streak`: Current streak
- `bestStreak`: All-time best
- `lastActiveDate`: Last activity

#### healthProfiles
- `userKey`: User identifier
- `age`: Age group
- `gender`: Gender
- `hasRespiratoryCondition`: Boolean
- `conditions`: Array of conditions
- `conditionSeverity`: Severity level
- `activityLevel`: Activity level
- `outdoorExposure`: Exposure level
- `smokingStatus`: Smoking status
- `livesNearTraffic`: Boolean
- `hasAirPurifier`: Boolean
- `isPregnant`: Boolean
- `hasHeartCondition`: Boolean
- `medications`: Array
- `isComplete`: Profile completion

#### exposures
- `profileId`: Reference to profile
- `lat`, `lon`: Coordinates
- `locationName`: Location name
- `timestamp`: When logged
- `pm25`, `no2`, `co`: Readings
- `mode`: Transport mode
- `riskLevel`: Risk classification
- `tips`: Health tips shown
- `score`: Exposure score

#### airQualityHistory
- `userKey`: User identifier
- `lat`, `lng`: Coordinates
- `locationName`: Location name
- `aqi`: Air quality index
- `pm25`, `pm10`, `no2`, `co`, `o3`, `so2`: Readings
- `source`: Data source
- `riskLevel`: Risk level
- `timestamp`: Reading time
- `date`: Date for grouping

---

## 🎨 Styling

### Tailwind CSS 4
- **Utility Classes**: Rapid styling
- **Custom Colors**: Brand colors
- **Dark Mode Ready**: (Future implementation)
- **Responsive Design**: Mobile-first approach

### Custom CSS Files
- `globals.css`: Global styles and animations
- `ChatWidget.css`: Chat component styles
- `AirQualityComparison.css`: Chart styles
- `HealthcareFinder.css`: Healthcare finder styles
- `Navbar.css`: Navigation styles
- `DataSourceIndicator.css`: Data source badge

---

## 🔒 Security Features

### Authentication
- **Password Hashing**: SHA-256 with salt
- **Session Tokens**: Secure random tokens
- **Session Expiry**: Automatic expiration
- **HTTPS Only**: Secure transport (production)

### API Security
- **Rate Limiting**: Request throttling
- **Input Validation**: Sanitized inputs
- **Error Handling**: No sensitive data in errors

---

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Adaptive Features
- **Collapsible Navigation**: Mobile menu
- **Flexible Grids**: Responsive layouts
- **Touch-Friendly**: Large tap targets
- **Optimized Images**: Lazy loading

---

## 🚀 Performance Optimizations

### Caching
- **API Response Cache**: 5-minute TTL
- **Map Tile Cache**: Browser cache
- **State Persistence**: LocalStorage

### Code Splitting
- **Dynamic Imports**: Map components
- **Route-based Splitting**: Next.js automatic

### Debouncing
- **Search Inputs**: 300ms delay
- **API Calls**: Prevents flooding
- **Map Events**: Throttled updates
