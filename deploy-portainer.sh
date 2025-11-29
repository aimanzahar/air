#!/bin/bash

# Portainer Deployment Script for Air Quality App
# This script ensures Convex functions are deployed before starting the application

echo "🚀 Starting deployment for Portainer..."

# Check if CONVEX_DEPLOY_KEY is set
if [ -z "$CONVEX_DEPLOY_KEY" ]; then
    echo "⚠️  WARNING: CONVEX_DEPLOY_KEY environment variable is not set!"
    echo "   Please set this in your Portainer container environment variables"
    echo "   You can get this from your Convex dashboard under Settings → API Keys"
    echo ""
fi

# Check if NEXT_PUBLIC_CONVEX_URL is set
if [ -z "$NEXT_PUBLIC_CONVEX_URL" ]; then
    echo "⚠️  WARNING: NEXT_PUBLIC_CONVEX_URL environment variable is not set!"
    echo "   Please set this to your Convex deployment URL"
    echo "   Example: https://your-project.convex.cloud"
    echo ""
fi

# Deploy to Docker
echo "📦 Building and deploying Docker container..."
docker-compose up -d --build

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "   1. Check container logs: docker-compose logs -f"
echo "   2. Verify Convex deployment in the logs"
echo "   3. Access your app at: http://localhost:3000"
echo ""
echo "🔍 If Convex functions are missing:"
echo "   1. Ensure CONVEX_DEPLOY_KEY is set correctly"
echo "   2. Restart the container: docker-compose restart"
echo "   3. Check logs for any deployment errors"