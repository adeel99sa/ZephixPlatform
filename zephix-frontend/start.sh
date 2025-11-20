#!/bin/sh
# Railway startup script for frontend
# Ensures PORT environment variable is properly handled

PORT=${PORT:-8080}
echo "Starting serve on port $PORT"
exec serve -s dist -l $PORT

