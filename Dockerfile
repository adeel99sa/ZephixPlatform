# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy only backend's package files first (better layer caching)
COPY zephix-backend/package*.json ./zephix-backend/

# Install deps for backend
WORKDIR /app/zephix-backend
RUN npm ci

# Copy backend source
COPY zephix-backend/. .

# Build backend
RUN npm run build

# ---- Runner ----
FROM node:20-alpine
WORKDIR /app/zephix-backend

# Only copy what we need to run
COPY --from=builder /app/zephix-backend/node_modules ./node_modules
COPY --from=builder /app/zephix-backend/dist ./dist
COPY zephix-backend/package*.json ./

# Env & port
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Start command (using the existing start:railway script)
CMD ["npm", "run", "start:railway"]