# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL deps (incl. devDeps) for TypeScript build
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
# If you use Nest CLI: RUN npm run build
RUN npm run build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install ONLY production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output only
COPY --from=builder /app/dist ./dist

# If you need runtime assets (e.g., prisma, public, migrations), copy them too:
# COPY --from=builder /app/prisma ./prisma
# COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "dist/main.js"]
