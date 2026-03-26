# Build stage
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install dependencies for native modules + ffmpeg (x264/aac support for mp4 conversion)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    openssl \
    ffmpeg \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-bookworm-slim AS production

WORKDIR /app

# Install runtime tools needed by Prisma + healthcheck + ffmpeg for mp4 conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    ffmpeg \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nestjs

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy prisma schema and generate only Prisma Client
# (skip optional dbml generator which is dev-only)
COPY prisma ./prisma/
RUN npx prisma generate --generator client

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy docker entrypoint (run migrations before app start)
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create writable directories
RUN mkdir -p /app/logs /app/uploads /app/tmp && chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Ensure app uses system ffmpeg in container
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Start the application
CMD ["node", "dist/main.js"]
