# --- Build stage: compile the Vite app ---
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first for better caching
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# --- Runtime stage: serve static files with nginx ---
FROM nginx:alpine
# Copy built assets to nginx web root
COPY --from=build /app/dist /usr/share/nginx/html

# Optional: basic cache headers (can be customized later)
# Default nginx.conf works fine for SPA; if you use client-side routing,
# we can add a custom config to route 404s to index.html.

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
