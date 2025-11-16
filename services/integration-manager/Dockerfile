FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/shared/package*.json ./services/shared/
COPY services/integration-manager/package*.json ./services/integration-manager/

# Install dependencies
RUN npm ci

# Copy source code
COPY services/shared ./services/shared
COPY services/integration-manager ./services/integration-manager

# Build shared library first
WORKDIR /app/services/shared
RUN npm run build

# Build service
WORKDIR /app/services/integration-manager
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/shared/package*.json ./services/shared/
COPY services/integration-manager/package*.json ./services/integration-manager/

# Install production dependencies only
RUN npm ci --production

# Copy built files
COPY --from=builder /app/services/shared/dist ./services/shared/dist
COPY --from=builder /app/services/integration-manager/dist ./services/integration-manager/dist
COPY --from=builder /app/services/shared/node_modules/.prisma ./services/shared/node_modules/.prisma

WORKDIR /app/services/integration-manager

EXPOSE 8001

CMD ["node", "dist/index.js"]
