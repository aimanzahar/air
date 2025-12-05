# NafasLokal - Air Exposure Passport

### 🌬️ *"Breathe Smarter. Live Healthier. One Commute at a Time."*

> **Hackathon Solution: Good Health & Well-Being through AI-Driven Air Quality Intelligence**

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Convex](https://img.shields.io/badge/Convex-Real--time-orange)](https://convex.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-cyan?logo=tailwindcss)](https://tailwindcss.com/)

Urban residents in fast-developing Malaysian cities face growing health risks from worsening air quality and traffic congestion. Prolonged exposure to pollutants like PM2.5, NO₂, and CO contributes to respiratory illnesses, while congestion increases stress and accident risks. Despite available open datasets, city health planning often lacks real-time insights, leaving vulnerable communities exposed.

**NafasLokal** is an AI-driven solution that integrates air quality, traffic patterns, and health data to support better decision-making for healthier cities.

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
- [System Requirements](#-system-requirements)
- [Installation Guide](#-installation-guide)
- [Environment Configuration](#-environment-configuration)
- [Running the Application](#-running-the-application)
- [Deployment Options](#-deployment-options)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Data Integration](#-data-integration)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)
- [Team](#-team)
- [License](#-license)

---

## 🎯 Problem Statement

- **Air pollution health crisis**: Malaysian cities experience hazardous air quality during haze season and peak traffic hours
- **Lack of actionable insights**: Raw pollution data exists but isn't translated into health-protective actions
- **Vulnerable populations at risk**: Children, elderly, asthma patients, and outdoor workers need timely, personalized alerts
- **No incentive for behavior change**: People lack motivation to choose healthier commute options

## 💡 Our Solution

NafasLokal addresses these challenges through four integrated pillars:

### 1. Real-Time Air Quality Intelligence
- Live PM2.5, NO₂, CO, and O₃ data from DOE Malaysia, WAQI, and OpenAQ
- Location-based exposure scoring with health risk levels
- Interactive map with pollution heatmaps and station markers

### 2. AI-Powered Health Predictions
- 24-hour pollutant forecasts using machine learning
- Personalized health scores based on exposure patterns
- Actionable recommendations (optimal exercise windows, route suggestions)
- Vulnerable group advisories with specific guidance

### 3. Gamified Behavior Change (BreathQuest)
- Daily/weekly challenges encouraging healthier choices
- XP system, streaks, badges, and leaderboards
- Rewards for choosing public transit, avoiding peak pollution hours
- Community impact tracking

### 4. Smart Commute Planning
- Route recommendations based on real-time air quality
- Peak pollution hour alerts
- Transit vs. driving comparison for exposure levels
- Green corridor suggestions

---

## 🏆 Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Live Dashboard** | Real-time AQI with multi-source data fusion | ✅ Implemented |
| **AI Health Score** | Personalized health assessment based on exposure | ✅ Implemented |
| **AI Chatbot** | Conversational AI for health & air quality queries | ✅ Implemented |
| **Pollutant Forecast** | 24-hour predictions for PM2.5, NO₂, O₃, CO | ✅ Implemented |
| **BreathQuest** | Gamification with challenges, badges, leaderboard | ✅ Implemented |
| **Interactive Map** | Heatmap visualization with station markers | ✅ Implemented |
| **Trend Analytics** | 7-day/30-day historical analysis | ✅ Implemented |
| **Health Alerts** | Push notifications for high-risk periods | ✅ Implemented |
| **Healthcare Finder** | Nearby healthcare facilities locator | ✅ Implemented |
| **Health Profile** | Personalized health passport for recommendations | ✅ Implemented |
| **User Authentication** | Secure login and registration system | ✅ Implemented |

---

## 💻 System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **Operating System** | Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+) |
| **Node.js** | v20.0.0 or higher |
| **npm** | v10.0.0 or higher |
| **RAM** | 4GB minimum, 8GB recommended |
| **Storage** | 500MB for dependencies and build files |
| **Browser** | Chrome 90+, Firefox 90+, Safari 14+, Edge 90+ |

### For Docker Deployment

| Component | Requirement |
|-----------|-------------|
| **Docker** | v24.0.0 or higher |
| **Docker Compose** | v2.20.0 or higher |

---

## 📦 Installation Guide

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/aimanzahar/air.git

# Navigate to project directory
cd air
```

### Step 2: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Or using npm ci for exact versions (recommended for production)
npm ci
```

### Step 3: Set Up Environment Variables

```bash
# Copy the example environment file
# Windows (PowerShell):
Copy-Item .env.example .env.local

# Windows (Command Prompt):
copy .env.example .env.local

# Linux/macOS:
cp .env.example .env.local
```

### Step 4: Configure Environment Variables

Edit `.env.local` with your configuration. See [Environment Configuration](#-environment-configuration) for details.

### Step 5: Set Up Convex (Database)

```bash
# Login to Convex (first time only)
npx convex login

# Initialize Convex project (first time only)
npx convex init

# Deploy Convex functions
npx convex deploy
```

---

## ⚙️ Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

### Required Variables

| Variable | Description | How to Obtain |
|----------|-------------|---------------|
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL | Sign up at [convex.dev](https://convex.dev), create project, copy URL from dashboard |
| `CONVEX_DEPLOY_KEY` | Convex deployment API key | Convex Dashboard → Settings → API Keys → Create "Deployment" key |
| `OPENAI_API_KEY` | OpenAI API key for AI features | Sign up at [platform.openai.com](https://platform.openai.com) |
| `OPENAI_BASE_URL` | OpenAI API endpoint | `https://api.openai.com/v1` (default) |
| `OPENAI_MODEL` | AI model to use | `gpt-4` or `gpt-3.5-turbo` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |
| `WAQI_API_TOKEN` | WAQI API token (enhanced data) | Uses public API |
| `OPENAQ_API_KEY` | OpenAQ API key (enhanced data) | Uses public API |

### Example `.env.local`

```env
# Convex Database
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=convex_1a2b3c4d5e...

# AI Configuration
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# Application
NODE_ENV=development
PORT=3000
```

---

## 🚀 Running the Application

### Development Mode

```bash
# Start development server with hot reload
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Using Docker

```bash
# Build and start with Docker Compose
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

---

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Quick Deploy)

1. Push code to GitHub
2. Visit [vercel.com](https://vercel.com) and import your repository
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Option 2: Docker / Portainer

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Docker and Portainer deployment instructions.

```bash
# Quick Docker deployment
docker build -t nafaslokal .
docker run -p 3000:3000 --env-file .env.local nafaslokal
```

### Option 3: Self-Hosted (VPS/Cloud)

```bash
# On your server
git clone https://github.com/aimanzahar/air.git
cd air
npm ci
cp .env.example .env.local
# Edit .env.local with your values
npm run build
npm start
```

---

## 📁 Project Structure

```
air/
├── convex/                    # Convex backend (real-time database)
│   ├── air/                   # Air quality module
│   │   ├── schema.ts          # Database schema definitions
│   │   ├── auth.ts            # Authentication functions
│   │   ├── passport.ts        # User profile functions
│   │   ├── healthProfile.ts   # Health profile functions
│   │   └── airQualityHistory.ts # Air quality data functions
│   └── _generated/            # Auto-generated Convex files
│
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── dashboard/         # Main dashboard with air quality map
│   │   ├── ai-health/         # AI health predictions page
│   │   ├── gamification/      # BreathQuest gamification page
│   │   ├── register/          # User registration page
│   │   └── api/               # API routes
│   │       ├── ai-health/     # AI health endpoint
│   │       ├── air-quality/   # Air quality data endpoint
│   │       ├── chat/          # AI chatbot endpoint
│   │       ├── healthcare/    # Healthcare facilities endpoint
│   │       ├── waqi/          # WAQI API integration
│   │       ├── openaq/        # OpenAQ API integration
│   │       └── doe/           # DOE Malaysia API integration
│   │
│   ├── components/            # React components
│   │   ├── map/               # Map components (AirQualityMap, Heatmap)
│   │   ├── chat/              # Chat widget components
│   │   ├── health/            # Health profile components
│   │   ├── healthcare/        # Healthcare finder components
│   │   ├── analytics/         # Analytics & comparison charts
│   │   └── navigation/        # Navigation components
│   │
│   ├── contexts/              # React context providers
│   │   ├── AuthContext.tsx    # Authentication state
│   │   └── ChatContext.tsx    # Chat state management
│   │
│   ├── lib/                   # Utility libraries
│   │   ├── airQualityService.ts  # Air quality data fetching
│   │   ├── chatService.ts        # Chat API service
│   │   ├── healthcareService.ts  # Healthcare API service
│   │   └── locationService.ts    # Geolocation utilities
│   │
│   └── types/                 # TypeScript type definitions
│       ├── airQuality.ts      # Air quality types
│       └── chat.ts            # Chat types
│
├── docs/                      # Documentation
│   └── chatbot-architecture.md
│
├── scripts/                   # Deployment scripts
│   ├── start.sh               # Production start script
│   └── verify-convex.sh       # Convex verification
│
├── public/                    # Static assets
├── docker-compose.yml         # Docker Compose configuration
├── Dockerfile                 # Docker build configuration
├── DEPLOYMENT.md              # Deployment guide
└── package.json               # Project dependencies
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16 (App Router) | React framework with SSR/SSG |
| **UI Framework** | React 19 | Component-based UI |
| **Styling** | Tailwind CSS 4 | Utility-first CSS framework |
| **Backend** | Convex | Real-time serverless database |
| **AI/ML** | OpenAI API | Health predictions & chatbot |
| **Maps** | Leaflet + React-Leaflet | Interactive map visualization |
| **Charts** | Recharts | Data visualization |
| **Language** | TypeScript 5 | Type-safe JavaScript |
| **Icons** | Heroicons | UI icons |

### Key Dependencies

```json
{
  "next": "16.0.5",
  "react": "19.2.0",
  "convex": "^1.29.3",
  "openai": "^6.9.1",
  "leaflet": "^1.9.4",
  "recharts": "^3.5.1",
  "tailwindcss": "^4"
}
```

---

## 📊 Data Integration

NafasLokal aggregates data from multiple authoritative sources:

| Source | Description | Data Provided |
|--------|-------------|---------------|
| **DOE Malaysia** | Official Department of Environment Malaysia | AQI, PM2.5, PM10, CO, NO₂, O₃, SO₂ |
| **WAQI** | World Air Quality Index | Global real-time AQI data |
| **OpenAQ** | Open-source environmental platform | Historical and real-time readings |

---

## 📡 API Documentation

### Internal API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/air-quality` | GET | Fetch air quality data by location |
| `/api/ai-health` | POST | Get AI health predictions |
| `/api/chat` | POST | AI chatbot interaction |
| `/api/healthcare` | GET | Find nearby healthcare facilities |
| `/api/waqi` | GET | WAQI API proxy |
| `/api/openaq` | GET | OpenAQ API proxy |
| `/api/doe` | GET | DOE Malaysia API proxy |
| `/api/health` | GET | Health check endpoint |

### Convex Functions

The application uses Convex for real-time data:

| Function | Description |
|----------|-------------|
| `passport:ensureProfile` | Create/get user profile |
| `passport:logExposure` | Log air quality exposure |
| `passport:getExposureHistory` | Fetch exposure history |
| `healthProfile:saveHealthProfile` | Save health profile |
| `healthProfile:getHealthProfile` | Get health profile |
| `airQualityHistory:saveReading` | Save AQ reading |
| `airQualityHistory:getHistory` | Get AQ history |

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Could not find public function for 'passport:ensureProfile'"

**Cause**: Convex functions not deployed

**Solution**:
```bash
npx convex deploy
```

#### 2. "NEXT_PUBLIC_CONVEX_URL is not defined"

**Cause**: Missing environment variables

**Solution**: Ensure `.env.local` exists with proper values

#### 3. Map not loading

**Cause**: Browser location permission denied

**Solution**: Allow location access or the map will use Kuala Lumpur as default

#### 4. AI features not working

**Cause**: OpenAI API key not configured

**Solution**: Add valid `OPENAI_API_KEY` to `.env.local`

#### 5. Build fails with memory error

**Cause**: Insufficient memory for Next.js build

**Solution**:
```bash
# Increase Node.js memory limit
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Getting Help

1. Check the [Convex Documentation](https://docs.convex.dev)
2. Review [Next.js Documentation](https://nextjs.org/docs)
3. Open an issue on GitHub

---

## 🎮 Gamification System (BreathQuest)

### Challenges
- **Daily**: Morning air checks, avoiding peak pollution
- **Weekly**: Clean route choices, public transit usage
- **Achievements**: Long-term health milestones

### Rewards
- XP points for healthy actions
- Streak bonuses for consistency
- Badges for achievements
- Leaderboard rankings

---

## 👥 Target Users

1. **Daily Commuters** - Route optimization for lower exposure
2. **Parents** - Protect children during outdoor activities
3. **Elderly** - Health alerts for sensitive individuals
4. **Outdoor Workers** - Mask and schedule recommendations
5. **Health-Conscious Citizens** - Track and improve air exposure

---

## 🌏 Impact

- **Health Protection**: Reduces respiratory illness risk through actionable alerts
- **Behavior Change**: Gamification drives adoption of healthier commute choices
- **Community Data**: Crowdsourced readings improve pollution mapping
- **Vulnerable Support**: Targeted advisories for at-risk populations
- **Urban Planning**: Data insights for city health policy decisions

---

## 📱 Screenshots

### Landing Page
*Malaysia-first air wellness platform with clean, modern design*

### Dashboard
*Real-time AQI dashboard with interactive map, exposure tracking, and AI chat*

### AI Health Predictions
*Personalized health scores with 24-hour pollutant forecasts*

### BreathQuest Gamification
*Gamified challenges with XP system, badges, and leaderboards*

---

## 🔮 Future Roadmap

- [ ] Mobile app (React Native)
- [ ] Integration with wearables for personal exposure tracking
- [ ] Clinic proximity analysis for underserved areas
- [ ] Traffic density API integration
- [ ] Multi-city expansion (Penang, JB)

---

## 👨‍💻 Team

Built for Malaysia's urban health future.

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

- DOE Malaysia for air quality data
- WAQI for global air quality index
- OpenAQ for open environmental data
- Convex for real-time database infrastructure
- OpenAI for AI/ML capabilities
