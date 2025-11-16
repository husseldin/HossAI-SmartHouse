FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/shared/package*.json ./services/shared/
COPY services/network-service/package*.json ./services/network-service/

# Install dependencies
RUN npm ci

# Copy source code
COPY services/shared ./services/shared
COPY services/network-service ./services/network-service

# Build shared library first
WORKDIR /app/services/shared
RUN npm run build

# Build service
WORKDIR /app/services/network-service
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/shared/package*.json ./services/shared/
COPY services/network-service/package*.json ./services/network-service/

# Install production dependencies only
RUN npm ci --production

# Copy built files
COPY --from=builder /app/services/shared/dist ./services/shared/dist
COPY --from=builder /app/services/network-service/dist ./services/network-service/dist
COPY --from=builder /app/services/shared/node_modules/.prisma ./services/shared/node_modules/.prisma

WORKDIR /app/services/network-service

EXPOSE 8001

CMD ["node", "dist/index.js"]
