# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source files
COPY . .

# Build the NestJS app
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

# Copy built app and production dependencies from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose your app port (default 3000)
EXPOSE 3000

# Run the built app
CMD ["node", "dist/main.js"]
