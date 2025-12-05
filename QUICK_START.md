# NafasLokal - Quick Reference Guide

## 🚀 5-Minute Quick Start

```bash
# 1. Clone and install
git clone https://github.com/aimanzahar/air.git
cd air
npm install

# 2. Configure environment (Windows PowerShell)
Copy-Item .env.example .env.local
# Edit .env.local with your Convex and OpenAI keys

# 3. Deploy database and start
npx convex deploy
npm run dev

# 4. Open http://localhost:3000
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `README.md` | Complete documentation |
| `DEPLOYMENT.md` | Deployment instructions |
| `FEATURES.md` | Feature documentation |
| `.env.example` | Environment template |
| `package.json` | Dependencies |
| `docker-compose.yml` | Docker configuration |

---

## 🔑 Required Environment Variables

```env
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=convex_...
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4
```

---

## 📱 Application Pages

| URL | Description |
|-----|-------------|
| `/` | Landing page |
| `/dashboard` | Main dashboard with map |
| `/ai-health` | AI health predictions |
| `/gamification` | BreathQuest challenges |
| `/register` | User registration |

---

## ✅ Feature Checklist

- [x] Real-time air quality dashboard
- [x] Interactive map with heatmap
- [x] Multi-source data (DOE, WAQI, OpenAQ)
- [x] AI-powered health predictions
- [x] AI chat assistant
- [x] User authentication
- [x] Health profile management
- [x] Exposure tracking & history
- [x] Gamification system
- [x] Healthcare facility finder
- [x] Responsive design
- [x] Docker deployment support

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Convex (real-time database)
- **AI**: OpenAI API
- **Maps**: Leaflet + React-Leaflet
- **Charts**: Recharts

---

## 📞 Support

- Documentation: See `README.md` and `DEPLOYMENT.md`
- Issues: GitHub Issues
- Convex: https://docs.convex.dev
- Next.js: https://nextjs.org/docs
