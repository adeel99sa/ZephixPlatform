#!/bin/sh

# Zephix Frontend - Enterprise Nginx Startup Script
# Enhanced with security, logging, and error handling

set -euo pipefail

# Get the port from Railway environment variable, default to 80
export PORT=${PORT:-80}

# Log startup information
echo "=========================================="
echo "Zephix Frontend - Enterprise Startup"
echo "=========================================="
echo "Starting nginx on port $PORT"
echo "Container working directory: $(pwd)"
echo "Nginx version: $(nginx -v 2>&1)"
echo "User: $(whoami)"
echo "Process ID: $$"
echo "=========================================="

# Verify nginx configuration file exists
if [ ! -f /etc/nginx/nginx.conf ]; then
    echo "ERROR: nginx.conf not found!"
    echo "Container state:"
    ls -la /etc/nginx/
    exit 1
fi

# Verify built assets exist
if [ ! -d /usr/share/nginx/html ]; then
    echo "ERROR: Built assets directory not found!"
    echo "Container state:"
    ls -la /usr/share/nginx/
    exit 1
fi

echo "Built assets found in: /usr/share/nginx/html"
ls -la /usr/share/nginx/html/

# Verify nginx binary and permissions
if [ ! -x /usr/sbin/nginx ]; then
    echo "ERROR: nginx binary not found or not executable!"
    exit 1
fi

# Use envsubst to substitute environment variables in nginx config
echo "Processing nginx configuration with PORT=$PORT"
envsubst '${PORT}' < /etc/nginx/nginx.conf > /tmp/nginx.conf

# Verify the processed config
echo "Verifying nginx configuration..."
if ! nginx -t -c /tmp/nginx.conf; then
    echo "ERROR: Invalid nginx configuration!"
    echo "Processed config content:"
    cat /tmp/nginx.conf
    exit 1
fi

# Set up signal handling for graceful shutdown
trap 'echo "Received shutdown signal, stopping nginx..."; nginx -s quit; exit 0' TERM INT

echo "Starting nginx with processed configuration..."
echo "=========================================="

# Start nginx with the processed config
exec nginx -c /tmp/nginx.conf -g "daemon off;"
