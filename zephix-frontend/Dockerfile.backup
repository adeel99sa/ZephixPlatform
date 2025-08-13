# build
FROM node:20-alpine AS build
WORKDIR /app
COPY zephix-frontend/package*.json ./
RUN npm ci
COPY zephix-frontend/ .
RUN npm run build

# run
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build /app/dist ./
RUN printf 'server {\n  listen 8080;\n  server_name _;\n  root /usr/share/nginx/html;\n  location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; try_files $uri =404; }\n  location / { try_files $uri $uri/ /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1
CMD ["nginx","-g","daemon off;"]
