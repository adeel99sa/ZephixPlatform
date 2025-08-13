#!/bin/sh

# Get the port from Railway environment variable, default to 80
export PORT=${PORT:-80}

echo "Starting nginx on port $PORT"
echo "Container working directory: $(pwd)"
echo "Nginx version: $(nginx -v 2>&1)"

# Verify nginx configuration file exists
if [ ! -f /etc/nginx/nginx.conf ]; then
    echo "ERROR: nginx.conf not found!"
    exit 1
fi

# Verify built assets exist
if [ ! -d /usr/share/nginx/html ]; then
    echo "ERROR: Built assets directory not found!"
    exit 1
fi

echo "Built assets found in: /usr/share/nginx/html"
ls -la /usr/share/nginx/html/

# Use envsubst to substitute environment variables in nginx config
echo "Processing nginx configuration with PORT=$PORT"
envsubst '${PORT}' < /etc/nginx/nginx.conf > /tmp/nginx.conf

# Verify the processed config
echo "Verifying nginx configuration..."
nginx -t -c /tmp/nginx.conf

if [ $? -ne 0 ]; then
    echo "ERROR: Invalid nginx configuration!"
    cat /tmp/nginx.conf
    exit 1
fi

echo "Starting nginx with processed configuration..."
# Start nginx with the processed config
exec nginx -c /tmp/nginx.conf -g "daemon off;"
