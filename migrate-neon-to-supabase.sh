#!/bin/bash
set -e

# Migration script: Neon to Supabase
# Source: Neon database
# Destination: Supabase database

NEON_CONN="postgresql://neondb_owner:npg_Byxf6gZ8JeMU@ep-broad-rain-a4nc7o10-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
SUPABASE_CONN="postgresql://postgres:eAQLdIlYTwPhCVnS@db.bfqckayblrkwcrmgukri.supabase.co:5432/postgres"

echo "Starting migration from Neon to Supabase..."
echo ""

# Check if pg_dump and pg_restore are available
if ! command -v pg_dump &> /dev/null; then
    echo "Error: pg_dump not found. Please install postgresql-client:"
    echo "  sudo apt install postgresql-client"
    echo ""
    echo "Or use Docker:"
    echo "  docker run --rm -v \$(pwd):/backup postgres:15 pg_dump ..."
    exit 1
fi

# Create backup directory
BACKUP_DIR="./migration-backup"
mkdir -p "$BACKUP_DIR"
DUMP_FILE="$BACKUP_DIR/neon-dump-$(date +%Y%m%d-%H%M%S).sql"

echo "Step 1: Creating dump from Neon database..."
pg_dump "$NEON_CONN" \
    --verbose \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    --format=plain \
    --file="$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo "Error: Failed to create dump from Neon"
    exit 1
fi

echo "Dump created: $DUMP_FILE"
echo ""

echo "Step 2: Restoring to Supabase database..."
psql "$SUPABASE_CONN" -f "$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo "Error: Failed to restore to Supabase"
    exit 1
fi

echo ""
echo "Step 3: Verifying migration..."
echo "Checking table counts..."

# Get table list and counts from Neon
echo "Tables in Neon database:"
psql "$NEON_CONN" -c "\dt" || echo "Could not list tables from Neon"

echo ""
echo "Tables in Supabase database:"
psql "$SUPABASE_CONN" -c "\dt" || echo "Could not list tables from Supabase"

echo ""
echo "Migration completed!"
echo "Backup saved to: $DUMP_FILE"
echo ""
echo "Next steps:"
echo "1. Verify data integrity by comparing row counts"
echo "2. Update your application connection strings to use Supabase"
echo "3. Test your application with the new database"
