# ---- Build stage ----
FROM node:18-alpine AS builder

# Set build arguments for reproducible builds
ARG NODE_ENV=production
ARG BUILD_VERSION=latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with security best practices
RUN npm ci --only=production --audit=false --fund=false --loglevel=error

# Copy all source files
COPY . .

# Build the production assets
RUN npm run build

# ---- Production stage ----
FROM nginx:alpine

# Set labels for enterprise compliance
LABEL maintainer="Zephix Development Team"
LABEL version="${BUILD_VERSION}"
LABEL description="Zephix Frontend - Enterprise React Application"
LABEL vendor="Zephix"

# Install required packages with security considerations
RUN apk add --no-cache --update \
    bash \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nginx && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh

# Set proper ownership for security
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

# Create health check directory
RUN mkdir -p /tmp/nginx && chown nginx:nginx /tmp/nginx

# Expose port 80 for HTTP (Railway will handle port mapping)
EXPOSE 80

# Set the working directory to nginx html directory
WORKDIR /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Use startup script to handle PORT environment variable
# This ensures Railway doesn't try to run npm start
ENTRYPOINT ["/start-nginx.sh"]
CMD []
