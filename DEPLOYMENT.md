# Deployment Guide

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
  - [Option 1: Local Development](#option-1-local-development)
  - [Option 2: Docker Deployment](#option-2-docker-deployment)
  - [Option 3: Portainer Deployment](#option-3-portainer-deployment)
  - [Option 4: Vercel Deployment](#option-4-vercel-deployment)
- [Environment Variables](#environment-variables)
- [Convex Setup](#convex-setup)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/aimanzahar/air.git
cd air

# Install dependencies
npm install

# Copy environment file
# Windows PowerShell:
Copy-Item .env.example .env.local
# Linux/Mac:
# cp .env.example .env.local

# Edit .env.local with your values (see Environment Variables section)

# Deploy Convex functions
npx convex deploy

# Start development server
npm run dev
```

---

## Prerequisites

### For Local Development

| Requirement | Version | Installation |
|------------|---------|--------------|
| Node.js | v20.0+ | [nodejs.org](https://nodejs.org) |
| npm | v10.0+ | Included with Node.js |
| Git | Latest | [git-scm.com](https://git-scm.com) |

### For Docker Deployment

| Requirement | Version | Installation |
|------------|---------|--------------|
| Docker | v24.0+ | [docker.com](https://docker.com) |
| Docker Compose | v2.20+ | Included with Docker Desktop |

### External Services

| Service | Required | Purpose | Sign Up |
|---------|----------|---------|---------|
| Convex | Yes | Real-time database | [convex.dev](https://convex.dev) |
| OpenAI | Yes (for AI features) | AI chatbot & predictions | [platform.openai.com](https://platform.openai.com) |

---

## Deployment Options

### Option 1: Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env.local
   
   # Linux/Mac
   cp .env.example .env.local
   ```

3. **Edit `.env.local`** with your values:
   ```env
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   CONVEX_DEPLOY_KEY=convex_...
   OPENAI_API_KEY=sk-...
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_MODEL=gpt-4
   ```

4. **Deploy Convex Functions**
   ```bash
   npx convex deploy
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access Application**
   Open [http://localhost:3000](http://localhost:3000)

---

### Option 2: Docker Deployment

1. **Clone and Navigate**
   ```bash
   git clone https://github.com/aimanzahar/air.git
   cd air
   ```

2. **Create Environment File**
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env
   
   # Linux/Mac
   cp .env.example .env
   ```

3. **Edit `.env`** with your production values

4. **Build and Run**
   ```bash
   # Build and start
   docker-compose up --build
   
   # Or run in background
   docker-compose up -d --build
   ```

5. **Access Application**
   Open [http://localhost:3000](http://localhost:3000)

6. **View Logs**
   ```bash
   docker-compose logs -f web
   ```

7. **Stop Application**
   ```bash
   docker-compose down
   ```

---

### Option 3: Portainer Deployment

#### Overview
This guide explains how to deploy the Air Quality application to Portainer with automatic Convex function deployment.

#### Prerequisites

1. **Convex Account & Project**
   - Create a Convex account at [convex.dev](https://convex.dev)
   - Create a new project
   - Note your project URL (e.g., `https://your-project.convex.cloud`)

2. **Convex Deployment Key**
   - Go to your Convex dashboard
   - Navigate to Settings → API Keys
   - Create a new "Deployment" key
   - Copy the key - you'll need this for Portainer

3. **Portainer Setup**
   - Ensure Portainer is running and accessible
   - Have Docker stack/container privileges

#### Deployment Steps

1. **In Portainer**:
   - Go to **Stacks → Add stack**
   - Name: `nafaslokal`

2. **Upload docker-compose.yml** or paste content:
   ```yaml
   version: "3.9"
   
   services:
     web:
       build:
         context: .
         dockerfile: Dockerfile
       container_name: air-app
       environment:
         NODE_ENV: production
         NEXT_PUBLIC_CONVEX_URL: ${NEXT_PUBLIC_CONVEX_URL}
         CONVEX_DEPLOY_KEY: ${CONVEX_DEPLOY_KEY}
         OPENAI_API_KEY: ${OPENAI_API_KEY}
         OPENAI_BASE_URL: ${OPENAI_BASE_URL}
         OPENAI_MODEL: ${OPENAI_MODEL}
       ports:
         - "3000:3000"
       restart: unless-stopped
   ```

3. **Add Environment Variables**:
   - NEXT_PUBLIC_CONVEX_URL
   - CONVEX_DEPLOY_KEY
   - OPENAI_API_KEY
   - OPENAI_BASE_URL
   - OPENAI_MODEL

4. **Deploy the Stack**

---

### Option 4: Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**
   Add in Vercel dashboard:
   - `NEXT_PUBLIC_CONVEX_URL`
   - `CONVEX_DEPLOY_KEY`
   - `OPENAI_API_KEY`
   - `OPENAI_BASE_URL`
   - `OPENAI_MODEL`

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

5. **Deploy Convex Functions**
   ```bash
   # Run locally after Vercel deploy
   npx convex deploy
   ```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL | `https://your-project.convex.cloud` |
| `CONVEX_DEPLOY_KEY` | Your Convex deployment API key | `convex_1a2b3c...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `OPENAI_BASE_URL` | OpenAI API endpoint | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | AI model to use | `gpt-4` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONVEX_SELF_HOSTED_URL` | Self-hosted Convex URL | - |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Self-hosted admin key | - |
| `PORT` | Application port | `3000` |
| `NODE_ENV` | Environment | `production` |

### Self-Hosted Convex

For self-hosted Convex, use:
```env
NEXT_PUBLIC_CONVEX_URL=https://your-self-hosted-url
CONVEX_SELF_HOSTED_URL=https://your-self-hosted-url
CONVEX_PRODUCTION_URL=https://your-self-hosted-url
CONVEX_SELF_HOSTED_ADMIN_KEY=<self-hosted admin key>
```

---

## Convex Setup

### First-Time Setup

1. **Login to Convex**
   ```bash
   npx convex login
   ```

2. **Initialize Project** (if new)
   ```bash
   npx convex init
   ```

3. **Deploy Functions**
   ```bash
   npx convex deploy
   ```

### Automatic Deployment

The application is configured to automatically deploy Convex functions:

1. **During Build**: Functions are deployed if `CONVEX_DEPLOY_KEY` is present
2. **At Runtime**: Functions are deployed again when the container starts via `scripts/start.sh`
3. **Required**: If no deploy/admin key is provided, the container will exit and log the missing key

---

## Verification

### Check Application Status

1. **Container Logs** (Docker)
   ```bash
   docker-compose logs -f web
   ```

2. **Look for These Messages**:
   ```
   📡 Deploying Convex functions...
   ✅ Convex deploy completed!
   Starting Next.js server...
   ```

3. **Health Check**
   ```bash
   curl http://localhost:3000/api/health
   ```

4. **Test the Application**
   - Navigate to `http://localhost:3000`
   - Check browser console for any errors
   - Verify data is loading correctly
   - Test user registration and login
   - Test dashboard functionality
   - Test AI chat feature

---

## Troubleshooting

### Convex Functions Not Found Error

If you see:
```
Could not find public function for 'passport:ensureProfile'
```

**Solution**:
1. Verify `CONVEX_DEPLOY_KEY` is correctly set
2. Restart the container: `docker-compose restart`
3. Check logs for deployment errors
4. Manually deploy: `npx convex deploy`

### Build Issues

1. **Node.js Version**: Ensure using Node.js 20 or later
2. **Dependencies**: Run `npm ci` to ensure clean dependencies
3. **Build Logs**: Check for any TypeScript or build errors
4. **Memory**: Increase Node.js memory if needed:
   ```bash
   # Windows PowerShell
   $env:NODE_OPTIONS="--max-old-space-size=4096"
   
   # Linux/Mac
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

### Runtime Issues

1. **Port Conflicts**: Ensure port 3000 is available
2. **Environment Variables**: Double-check all required variables are set
3. **Network**: Ensure the container can reach Convex servers

### AI Features Not Working

1. Verify `OPENAI_API_KEY` is set correctly
2. Check `OPENAI_BASE_URL` endpoint is reachable
3. Ensure API key has sufficient credits

---

## Security Notes

1. **Never commit secrets**: Do not commit `.env.local` or API keys to version control
2. **Use environment variables**: Always set sensitive data via environment variables
3. **Regular key rotation**: Consider rotating your API keys periodically
4. **HTTPS**: Use HTTPS in production

---

## Support

For issues related to:
- **Convex**: Check the [Convex Documentation](https://docs.convex.dev)
- **Next.js**: Check the [Next.js Documentation](https://nextjs.org/docs)
- **Portainer**: Check the [Portainer Documentation](https://docs.portainer.io)
- **Application**: Check the application logs and verify configuration
