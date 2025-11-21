FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

FROM node:20-alpine

WORKDIR /app

# Copy app artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.cjs ./server.cjs
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3000

# Use ENTRYPOINT to force Railway to run this, no matter what
ENTRYPOINT ["node", "server.cjs"]
