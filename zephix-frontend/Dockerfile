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
ENV PORT=8080
EXPOSE 8080
# Use shell form to interpolate Railway's PORT environment variable
CMD sh -c "serve -s dist -l ${PORT:-8080}"
