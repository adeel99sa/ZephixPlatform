# Build stage
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Set build environment variables with defaults
ARG VITE_API_URL=https://api.getzephix.com
ENV VITE_API_URL=${VITE_API_URL}

# Build the application
RUN npm run build

# Runtime stage
FROM nginx:stable-alpine

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Create nginx configuration
RUN printf 'server {\n  listen 8080;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  \n  # SPA fallback\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n  \n  # Static assets with long cache\n  location /assets/ {\n    add_header Cache-Control "public, max-age=31536000, immutable";\n    try_files $uri =404;\n  }\n  \n  # Health check endpoint\n  location /health {\n    access_log off;\n    return 200 "healthy";\n    add_header Content-Type text/plain;\n  }\n}' > /etc/nginx/conf.d/default.conf

# Remove any backup configurations
RUN rm -f /etc/nginx/conf.d/default.conf.bak /etc/nginx/conf.d/default.conf~

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]