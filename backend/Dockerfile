# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for native modules and Prisma
# - openssl: Required by Prisma query engine
# - python3, make, g++: Required for building native modules (hnswlib-node)
# - ca-certificates: For HTTPS connections
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Verify build output exists
RUN ls -la dist/ && \
    test -f dist/main.js && \
    echo "Build successful: dist/main.js exists"

# Production stage
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies for Prisma and native modules
# - openssl: Required by Prisma query engine
# - ca-certificates: For HTTPS connections
# - python3, make, g++: Required by native modules like hnswlib-node at runtime
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Verify copied files exist
RUN ls -la dist/ && \
    test -f dist/main.js && \
    echo "Production stage: dist/main.js exists"

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application
CMD ["node", "dist/main"]
