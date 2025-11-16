FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY web-ui/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY web-ui .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY web-ui/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
