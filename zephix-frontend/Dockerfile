FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime image
FROM node:20-alpine

WORKDIR /app

# Copy only what we need
COPY --from=builder /app/dist ./dist
COPY server.cjs ./server.cjs
COPY package*.json ./

# Install only production deps (Express)
RUN npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.cjs"]
