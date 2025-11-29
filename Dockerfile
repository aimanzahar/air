# syntax=docker/dockerfile:1

# Dev mode Dockerfile - skips production build
FROM node:20-alpine

WORKDIR /app

# Install curl for health check
RUN apk add --no-cache curl

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

EXPOSE 3000

# Default to dev mode
CMD ["npm", "run", "dev"]
