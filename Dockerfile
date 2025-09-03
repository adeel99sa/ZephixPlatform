FROM node:20-alpine AS builder
WORKDIR /app
COPY zephix-backend-v2/package*.json ./
RUN npm ci
COPY zephix-backend-v2/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -g 1001 -S app && adduser -S -u 1001 -G app app && chown -R app:app /app
USER app
COPY --chown=app:app --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --chown=app:app --from=builder /app/dist ./dist
COPY --chown=app:app --from=builder /app/nest-cli.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
