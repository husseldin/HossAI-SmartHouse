# Edge Hub Agent - Dockerfile for Raspberry Pi
# Supports both ARM64 and ARM32

FROM node:20-alpine

# Install system dependencies for serial port access
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers \
    udev

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose local API port
EXPOSE 8080

# Set environment
ENV NODE_ENV=production

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Grant serial port access
RUN addgroup nodejs dialout && \
    addgroup nodejs uucp

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
