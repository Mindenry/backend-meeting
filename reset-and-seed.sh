#!/bin/bash

# Script to reset database and run seed
# This script will:
# 1. Reset the database (drop all data)
# 2. Run all migrations
# 3. Run seed script

set -e

echo "🔄 Resetting database and running seed..."
echo ""

cd "$(dirname "$0")"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Warning: DATABASE_URL environment variable is not set"
    echo "   Make sure you have a .env file with DATABASE_URL"
fi

# Reset database and run seed
echo "📦 Resetting database..."
npx prisma db push --force-reset
npx prisma db seed

echo ""
echo "✅ Database reset and seed completed successfully!"
echo ""
echo "You can now start the application with:"
echo "  npm run start:dev"
