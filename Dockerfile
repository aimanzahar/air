# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL
ARG CONVEX_SITE_URL
ARG CONVEX_SELF_HOSTED_URL
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL=$NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL
ENV CONVEX_SITE_URL=$CONVEX_SITE_URL
ENV CONVEX_SELF_HOSTED_URL=$CONVEX_SELF_HOSTED_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/convex ./convex
COPY --from=deps /app/node_modules ./node_modules

# Install curl for health check
RUN apk add --no-cache curl

# Create startup script that deploys Convex at runtime
RUN echo "#!/bin/sh" > deploy-and-start.sh && \
    echo "echo 'Starting Air Quality Application...'" >> deploy-and-start.sh && \
    echo "" >> deploy-and-start.sh && \
    echo "echo 'Checking Convex configuration...'" >> deploy-and-start.sh && \
    echo "if [ ! -z \"\$CONVEX_DEPLOY_KEY\" ] && [ ! -z \"\$NEXT_PUBLIC_CONVEX_URL\" ]; then" >> deploy-and-start.sh && \
    echo "  echo 'Convex configuration found, deploying functions...'" >> deploy-and-start.sh && \
    echo "  echo 'Using Convex URL: \$CONVEX_PRODUCTION_URL'" >> deploy-and-start.sh && \
    echo "  npx convex deploy --admin-key \$CONVEX_SELF_HOSTED_ADMIN_KEY --prod" >> deploy-and-start.sh && \
    echo "  if [ \$? -eq 0 ]; then" >> deploy-and-start.sh && \
    echo "    echo '✅ Convex deployment successful!'" >> deploy-and-start.sh && \
    echo "  else" >> deploy-and-start.sh && \
    echo "    echo '❌ Convex deployment failed, but continuing...'" >> deploy-and-start.sh && \
    echo "  fi" >> deploy-and-start.sh && \
    echo "else" >> deploy-and-start.sh && \
    echo "  echo '⚠️  Convex deployment key or URL not set'" >> deploy-and-start.sh && \
    echo "  echo '  Please set CONVEX_DEPLOY_KEY and NEXT_PUBLIC_CONVEX_URL'" >> deploy-and-start.sh && \
    echo "  echo '  Application will start without Convex backend'" >> deploy-and-start.sh && \
    echo "fi" >> deploy-and-start.sh && \
    echo "" >> deploy-and-start.sh && \
    echo "echo '🚀 Starting Next.js server on port \$PORT...'" >> deploy-and-start.sh && \
    echo "exec npm start" >> deploy-and-start.sh && \
    chmod +x deploy-and-start.sh

EXPOSE 3000
CMD ["./deploy-and-start.sh"]
