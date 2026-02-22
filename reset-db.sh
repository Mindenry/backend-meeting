#!/bin/bash

# Script to completely reset the database and migrations
# This will drop the database, recreate it, and apply all migrations

echo "⚠️  WARNING: This will completely destroy your database!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

cd "$(dirname "$0")"

# Get database name from .env or use default
DB_NAME=$(grep DATABASE_URL .env | sed 's/.*\/\([^?]*\).*/\1/' || echo "meetdb")

echo "📦 Dropping database: $DB_NAME"
dropdb -h localhost -U postgres "$DB_NAME" 2>/dev/null || echo "Database doesn't exist or already dropped"

echo "📦 Creating fresh database: $DB_NAME"
createdb -h localhost -U postgres "$DB_NAME" 2>/dev/null || echo "Database already exists"

echo "🔄 Resetting Prisma migrations..."
npx prisma migrate reset --force --skip-seed

echo "✅ Database reset complete!"
