#!/bin/bash
# 🏥 Health Monitoring Script for Zephix Infrastructure
# Lightweight check that hits /api/health and alerts on non-200

set -e

# Configuration
API_URL="https://zephix-backend-production.up.railway.app"
LOG_FILE="health-monitor.log"
ALERT_EMAIL="" # Set this if you want email alerts

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check API health
check_api_health() {
    local response
    local status_code
    local health_status
    
    log "🔍 Checking API health at $API_URL"
    
    # Get response with status code
    response=$(curl -s -w "\n%{http_code}" "$API_URL/api/health" 2>/dev/null)
    status_code=$(echo "$response" | tail -n1)
    health_data=$(echo "$response" | head -n $(($(echo "$response" | wc -l) - 1)))
    
    if [ "$status_code" = "200" ]; then
        # Parse health status from JSON
        health_status=$(echo "$health_data" | jq -r '.status' 2>/dev/null || echo "unknown")
        
        if [ "$health_status" = "healthy" ]; then
            log "✅ API health check PASSED (200 OK, status: healthy)"
            return 0
        else
            log "⚠️  API health check WARNING (200 OK, but status: $health_status)"
            return 1
        fi
    else
        log "❌ API health check FAILED (HTTP $status_code)"
        return 2
    fi
}

# Function to check database directly
check_database() {
    log "🔍 Checking database connection directly"
    
    if psql "$DATABASE_URL" -c "select version(), now(), current_database();" &> /dev/null; then
        log "✅ Database connection PASSED"
        return 0
    else
        log "❌ Database connection FAILED"
        return 1
    fi
}

# Function to send alert (placeholder)
send_alert() {
    local message="$1"
    log "🚨 ALERT: $message"
    
    # Add email alert here if configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "Zephix Health Alert" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

# Main monitoring function
main() {
    log "🏥 Starting Zephix health monitoring"
    
    local api_status=0
    local db_status=0
    
    # Check API health
    check_api_health
    api_status=$?
    
    # Check database if API check failed
    if [ $api_status -ne 0 ]; then
        check_database
        db_status=$?
    fi
    
    # Determine overall status
    if [ $api_status -eq 0 ]; then
        log "✅ All systems healthy"
        exit 0
    elif [ $api_status -eq 1 ]; then
        log "⚠️  API degraded but responding"
        send_alert "API health check returned warning status"
        exit 1
    else
        log "❌ API health check failed"
        if [ $db_status -eq 0 ]; then
            send_alert "API health check failed but database is accessible"
        else
            send_alert "Both API and database health checks failed"
        fi
        exit 2
    fi
}

# Run the monitoring
main "$@"
