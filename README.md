# NafasLokal - Air Exposure Passport

> **Hackathon Solution: Good Health & Well-Being through AI-Driven Air Quality Intelligence**

Urban residents in fast-developing Malaysian cities face growing health risks from worsening air quality and traffic congestion. Prolonged exposure to pollutants like PM2.5, NO₂, and CO contributes to respiratory illnesses, while congestion increases stress and accident risks. Despite available open datasets, city health planning often lacks real-time insights, leaving vulnerable communities exposed.

**NafasLokal** is an AI-driven solution that integrates air quality, traffic patterns, and health data to support better decision-making for healthier cities.

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

| Feature | Description |
|---------|-------------|
| **Live Dashboard** | Real-time AQI with multi-source data fusion |
| **AI Health Score** | Personalized health assessment based on exposure |
| **Pollutant Forecast** | 24-hour predictions for PM2.5, NO₂, O₃, CO |
| **BreathQuest** | Gamification with challenges, badges, leaderboard |
| **Trend Analytics** | 7-day/30-day historical analysis |
| **Health Alerts** | Push notifications for high-risk periods |
| **Vulnerable Groups** | Targeted advisories for sensitive populations |

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Environment

Create `.env.local`:

```
NEXT_PUBLIC_CONVEX_URL=https://convex.zahar.my
CONVEX_SELF_HOSTED_URL=https://convex.zahar.my
CONVEX_SELF_HOSTED_ADMIN_KEY=<your-key>
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React, Tailwind CSS |
| Backend | Convex (self-hosted real-time database) |
| AI/ML | Predictive models for air quality forecasting |
| Data Sources | DOE Malaysia, WAQI API, OpenAQ |
| Maps | Leaflet with custom heatmap layers |

---

## 📊 Data Integration

NafasLokal aggregates data from multiple authoritative sources:

- **DOE Malaysia**: Official government air quality readings
- **WAQI (World Air Quality Index)**: Global air quality data
- **OpenAQ**: Open-source environmental data platform
- **Traffic patterns**: Rush hour analysis for exposure optimization

---

## 🎮 Gamification System

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

*Dashboard with real-time AQI, AI Health predictions, BreathQuest gamification*

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
