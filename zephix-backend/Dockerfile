# Zephix Backend - Railway-Optimized Dockerfile
# This Dockerfile is designed to work with Railway's root directory setting
# Railway sets the build context to zephix-backend/, so we don't need to copy from subdirectories

FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci

# Copy the entire source (Railway is already in zephix-backend directory)
COPY . .
RUN npm run build

# production stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application
COPY --from=build /app/dist ./dist

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1

# Start command - run migrations first, then start the app
CMD node dist/scripts/run-migrations.js && node dist/main.js