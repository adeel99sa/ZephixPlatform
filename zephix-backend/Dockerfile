# Multi-stage production Dockerfile for Zephix Backend
# This file is required by the GitHub Actions CI/CD pipeline
# Build context is zephix-backend directory

FROM node:20.19.0-alpine AS builder

WORKDIR /app

# Copy package and config files for caching
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY src ./src
COPY scripts ./scripts

# Build the application
RUN npm run build

# Production stage
FROM node:20.19.0-alpine AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl dumb-init

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production --prefer-offline --no-audit && \
    npm cache clean --force

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs
RUN chown -R nestjs:nodejs /app
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/api/health || exit 1

# Expose port
EXPOSE ${PORT:-3000}

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
