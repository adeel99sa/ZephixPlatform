# build
FROM node:20-alpine AS build
WORKDIR /app
COPY zephix-backend/package*.json ./
RUN npm ci
COPY zephix-backend/ .
RUN npm run build

# run
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:3000/health >/dev/null 2>&1 || exit 1
CMD node dist/scripts/run-migrations.js && node dist/main.js