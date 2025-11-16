FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/shared/package*.json ./services/shared/
COPY services/api-gateway/package*.json ./services/api-gateway/

# Install dependencies
RUN npm ci

# Copy source code
COPY services/shared ./services/shared
COPY services/api-gateway ./services/api-gateway

# Build shared library first
WORKDIR /app/services/shared
RUN npm run build

# Build api-gateway
WORKDIR /app/services/api-gateway
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/shared/package*.json ./services/shared/
COPY services/api-gateway/package*.json ./services/api-gateway/

# Install production dependencies only
RUN npm ci --production

# Copy built files
COPY --from=builder /app/services/shared/dist ./services/shared/dist
COPY --from=builder /app/services/api-gateway/dist ./services/api-gateway/dist

WORKDIR /app/services/api-gateway

EXPOSE 8000

CMD ["node", "dist/index.js"]
