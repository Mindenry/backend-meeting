#!/bin/bash

# Script to apply performance indexes migration
# Usage: ./scripts/apply-performance-indexes.sh [database_name]

DB_NAME=${1:-"meetdb"}

# Find the migration file (could be in root or in a migration folder)
MIGRATION_FILE=""
if [ -f "prisma/migrations/add_performance_indexes.sql" ]; then
    MIGRATION_FILE="prisma/migrations/add_performance_indexes.sql"
elif [ -d "prisma/migrations" ]; then
    # Find the latest performance indexes migration folder
    MIGRATION_FOLDER=$(find prisma/migrations -type d -name "*performance_indexes" | sort | tail -1)
    if [ -n "$MIGRATION_FOLDER" ] && [ -f "$MIGRATION_FOLDER/migration.sql" ]; then
        MIGRATION_FILE="$MIGRATION_FOLDER/migration.sql"
    fi
fi

if [ -z "$MIGRATION_FILE" ] || [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found"
    echo "   Looking for: prisma/migrations/add_performance_indexes.sql"
    echo "   Or: prisma/migrations/*_add_performance_indexes/migration.sql"
    echo ""
    echo "💡 Tip: Use Prisma migrate instead:"
    echo "   npx prisma migrate dev --name add_performance_indexes"
    exit 1
fi

echo "📋 Applying performance indexes to database: $DB_NAME"
echo "📄 Using migration file: $MIGRATION_FILE"
echo ""

psql -d "$DB_NAME" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Performance indexes applied successfully!"
    echo ""
    echo "🔍 Verify indexes with:"
    echo "   psql -d $DB_NAME -c \"\\d+ \\\"Meeting\\\"\""
    echo "   psql -d $DB_NAME -c \"\\d+ \\\"Task\\\"\""
else
    echo ""
    echo "❌ Failed to apply performance indexes"
    echo ""
    echo "💡 Check:"
    echo "   1. Database '$DB_NAME' exists"
    echo "   2. You have permission to create indexes"
    echo "   3. Database connection is working"
    exit 1
fi
