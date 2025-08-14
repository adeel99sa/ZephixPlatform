# Multi-stage production Dockerfile for Zephix Frontend
# This file is required by the GitHub Actions CI/CD pipeline
# Build context varies - try both repository root and zephix-frontend directory

FROM node:20.19.0-alpine AS builder

WORKDIR /app

# Copy package and config files for caching (try both contexts)
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code (try both contexts)
COPY src ./src
COPY public ./public
COPY index.html ./

# Build the application
RUN npm run build

# Production stage
FROM node:20.19.0-alpine AS production

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built assets
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S react -u 1001 -G nodejs
RUN chown -R react:nodejs /app
USER react

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

# Expose port
EXPOSE ${PORT:-8080}

# Start the application using serve (matches package.json script)
CMD ["serve", "-s", "dist", "-l", "8080"]
