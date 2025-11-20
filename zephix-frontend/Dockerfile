# zephix-frontend/Dockerfile

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Ensure prod API base is embedded at build-time (Railway env will inject VITE_API_BASE)
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/dist ./dist
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh
ENV PORT=8080
EXPOSE 8080
# Use startup script to properly handle Railway's PORT environment variable
CMD ["/app/start.sh"]
