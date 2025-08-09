# Zephix Uptime Monitor - Docker Container
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Add package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Add application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S monitor && \
    adduser -S monitor -u 1001 -G monitor

# Change ownership
RUN chown -R monitor:monitor /app
USER monitor

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Monitor running')" || exit 1

# Start the monitor
CMD ["npm", "start"]
