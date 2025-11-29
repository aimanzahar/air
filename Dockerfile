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
ARG CONVEX_DEPLOY_KEY
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL=$NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL
ENV CONVEX_SITE_URL=$CONVEX_SITE_URL
ENV CONVEX_SELF_HOSTED_URL=$CONVEX_SELF_HOSTED_URL
ENV CONVEX_DEPLOY_KEY=$CONVEX_DEPLOY_KEY
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Deploy Convex functions during build
RUN if [ ! -z "$CONVEX_DEPLOY_KEY" ]; then npx convex deploy; fi

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL
ARG CONVEX_SITE_URL
ARG CONVEX_SELF_HOSTED_URL
ARG CONVEX_DEPLOY_KEY
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL=$NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL
ENV CONVEX_SITE_URL=$CONVEX_SITE_URL
ENV CONVEX_SELF_HOSTED_URL=$CONVEX_SELF_HOSTED_URL
ENV CONVEX_DEPLOY_KEY=$CONVEX_DEPLOY_KEY
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/convex ./convex
COPY --from=deps /app/node_modules ./node_modules

# Deploy Convex functions again at runtime (in case of environment changes)
RUN echo "#!/bin/sh" > deploy-and-start.sh && \
    echo "echo 'Deploying Convex functions...'" >> deploy-and-start.sh && \
    echo "if [ ! -z \"\$CONVEX_DEPLOY_KEY\" ]; then" >> deploy-and-start.sh && \
    echo "  npx convex deploy --yes" >> deploy-and-start.sh && \
    echo "  echo 'Convex deployment completed!'" >> deploy-and-start.sh && \
    echo "else" >> deploy-and-start.sh && \
    echo "  echo 'No CONVEX_DEPLOY_KEY provided, skipping Convex deployment'" >> deploy-and-start.sh && \
    echo "fi" >> deploy-and-start.sh && \
    echo "echo 'Starting Next.js server...'" >> deploy-and-start.sh && \
    echo "exec npm start" >> deploy-and-start.sh && \
    chmod +x deploy-and-start.sh

EXPOSE 3000
CMD ["./deploy-and-start.sh"]
