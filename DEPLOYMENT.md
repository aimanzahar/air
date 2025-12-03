# Deployment Guide for Portainer

## Overview
This guide explains how to deploy the Air Quality application to Portainer with automatic Convex function deployment.

## Prerequisites

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

## Environment Variables

Before deploying, set these environment variables in Portainer:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL | `https://your-project.convex.cloud` |
| `CONVEX_DEPLOY_KEY` | Your Convex deployment API key | `convex_1a2b3c...` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CONVEX_ADMIN_KEY` | Convex admin key for additional operations | `convex_admin_...` |

## Deployment Steps

### Option 1: Using Docker Compose (Recommended)

1. **Clone and Navigate**
   ```bash
   git clone <your-repo>
   cd air
   ```

2. **Set Environment Variables**
   Create a `.env` file or set directly in Portainer:
   ```env
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   CONVEX_DEPLOY_KEY=convex_your_deployment_key_here
   ```
   For self-hosted Convex, use:
   ```env
   NEXT_PUBLIC_CONVEX_URL=https://your-self-hosted-url
   CONVEX_SELF_HOSTED_URL=https://your-self-hosted-url
   CONVEX_PRODUCTION_URL=https://your-self-hosted-url
   CONVEX_SELF_HOSTED_ADMIN_KEY=<self-hosted admin key>
   ```

3. **Deploy to Portainer**
   - In Portainer, go to Stacks
   - Add a new stack
   - Use the `docker-compose.yml` file from this repository
   - Set the environment variables in the "Environment" section
   - Click "Deploy the stack"

### Option 2: Using Web UI

1. In Portainer:
   - Go to **Containers → Add container**
   - Set the following:
     - **Name**: `air-app`
     - **Image**: Build from repository using the provided Dockerfile
     - **Ports**: `3000:3000`
   - Add the environment variables listed above
   - Click "Deploy"

## Automatic Convex Deployment

The application is configured to automatically deploy Convex functions:

1. **During Build**: Functions are deployed if `CONVEX_DEPLOY_KEY` is present
2. **At Runtime**: Functions are deployed again when the container starts via `scripts/start.sh`
3. **Required**: If no deploy/admin key is provided, the container will exit and log the missing key so you don’t serve a broken app

## Verification

1. **Check Container Logs**
   ```bash
   docker-compose logs -f web
   ```

2. **Look for These Messages**:
   ```
   Deploying Convex functions...
   Convex deployment completed!
   Starting Next.js server...
   ```

3. **Test the Application**
   - Navigate to `http://your-server:3000`
   - Check browser console for any Convex errors
   - Verify data is loading correctly

## Troubleshooting

### Convex Functions Not Found Error

If you see:
```
Could not find public function for 'passport:ensureProfile'
```

**Solution**:
1. Verify `CONVEX_DEPLOY_KEY` is correctly set in Portainer
2. Restart the container: `docker-compose restart`
3. Check logs for deployment errors

### Build Issues

1. **Node.js Version**: Ensure using Node.js 20 or later
2. **Dependencies**: Run `npm ci` to ensure clean dependencies
3. **Build Logs**: Check for any TypeScript or build errors

### Runtime Issues

1. **Port Conflicts**: Ensure port 3000 is available
2. **Environment Variables**: Double-check all required variables are set
3. **Network**: Ensure the container can reach Convex servers

## Local Development

To run locally with Convex deployment:

```bash
# Install dependencies
npm install

# Set Convex variables
export NEXT_PUBLIC_CONVEX_URL="https://your-project.convex.cloud"
export CONVEX_DEPLOY_KEY="your_key_here"

# Deploy Convex functions
npx convex deploy

# Start development server
npm run dev
```

## Security Notes

1. **Never commit secrets**: Do not commit `CONVEX_DEPLOY_KEY` to version control
2. **Use environment variables**: Always set sensitive data via environment variables
3. **Regular key rotation**: Consider rotating your Convex deployment keys periodically

## Support

For issues related to:
- **Convex**: Check the [Convex Documentation](https://docs.convex.dev)
- **Portainer**: Check the [Portainer Documentation](https://docs.portainer.io)
- **Application**: Check the application logs and verify configuration
