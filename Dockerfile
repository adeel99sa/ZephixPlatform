FROM node:20-alpine AS builder
WORKDIR /app
COPY zephix-backend-v2/package*.json ./
COPY zephix-backend-v2/tsconfig*.json ./
COPY zephix-backend-v2/nest-cli.json ./
RUN npm ci
COPY zephix-backend-v2/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -g 1001 -S app && adduser -S -u 1001 -G app app && chown -R app:app /app
USER app
COPY --chown=app:app --from=builder /app/package*.json ./
COPY --chown=app:app --from=builder /app/tsconfig*.json ./
COPY --chown=app:app --from=builder /app/nest-cli.json ./
RUN npm ci --omit=dev
COPY --chown=app:app --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
