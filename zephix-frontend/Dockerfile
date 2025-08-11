# ---- Build stage ----
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all source files
COPY . .

# Build the production assets
RUN npm run build

# ---- Production stage ----
FROM nginx:alpine

# Install envsubst for environment variable substitution
RUN apk add --no-cache bash

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh

# Expose port 80 for HTTP (Railway will handle port mapping)
EXPOSE 80

# Use startup script to handle PORT environment variable
CMD ["/start-nginx.sh"]
