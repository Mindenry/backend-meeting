#!/bin/bash

# Script to install required packages for production features
# Run this script from the backend-meeting directory

echo "📦 Installing required packages for production features..."
echo ""

cd "$(dirname "$0")"

# Install packages with --legacy-peer-deps to handle TypeScript version conflicts
npm install --save --legacy-peer-deps \
  class-validator \
  class-transformer \
  @nestjs/throttler \
  @nestjs/cache-manager \
  cache-manager \
  redis \
  ioredis \
  winston \
  nest-winston

echo ""
echo "✅ Package installation complete!"
echo ""
echo "Optional: If you want to use Redis caching, install:"
echo "  npm install --save --legacy-peer-deps cache-manager-redis-store"
echo ""
echo "Or use the newer package:"
echo "  npm install --save --legacy-peer-deps cache-manager-redis-yet"
