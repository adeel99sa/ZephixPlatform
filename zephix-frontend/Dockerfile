# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build /app/dist ./

# Nginx config
RUN printf 'server {\n listen 8080;\n server_name _;\n root /usr/share/nginx/html;\n location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; try_files $uri =404; }\n location / { try_files $uri $uri/ /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx","-g","daemon off;"]
