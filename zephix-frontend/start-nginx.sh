#!/bin/sh

# Get the port from Railway environment variable, default to 80
export PORT=${PORT:-80}

echo "Starting nginx on port $PORT"

# Use envsubst to substitute environment variables in nginx config
envsubst '${PORT}' < /etc/nginx/nginx.conf > /tmp/nginx.conf

# Start nginx with the processed config
exec nginx -c /tmp/nginx.conf -g "daemon off;"
