#!/bin/sh

# Set default port if not provided
export PORT=${PORT:-80}

echo "Starting nginx on port $PORT"

# Replace PORT placeholder in nginx config
envsubst '${PORT}' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp
mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf

# Start nginx in foreground
exec nginx -g "daemon off;"
