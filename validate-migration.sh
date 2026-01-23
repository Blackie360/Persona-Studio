#!/bin/bash
set -e

# Validation script to compare Neon and Supabase databases

NEON_CONN="postgresql://neondb_owner:npg_Byxf6gZ8JeMU@ep-broad-rain-a4nc7o10-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
SUPABASE_CONN="postgresql://postgres:eAQLdIlYTwPhCVnS@db.bfqckayblrkwcrmgukri.supabase.co:5432/postgres"

echo "=== Migration Validation ==="
echo ""

# Function to run query and get result
run_query() {
    local conn=$1
    local query=$2
    if command -v psql &> /dev/null; then
        psql "$conn" -t -A -c "$query" 2>/dev/null || echo "N/A"
    elif command -v docker &> /dev/null; then
        docker run --rm postgres:15 psql "$conn" -t -A -c "$query" 2>/dev/null || echo "N/A"
    else
        echo "N/A (no psql or docker)"
    fi
}

echo "1. Database Versions:"
echo "   Neon:     $(run_query "$NEON_CONN" "SELECT version();" | head -1)"
echo "   Supabase: $(run_query "$SUPABASE_CONN" "SELECT version();" | head -1)"
echo ""

echo "2. Table Counts:"
NEON_TABLES=$(run_query "$NEON_CONN" "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
SUPABASE_TABLES=$(run_query "$SUPABASE_CONN" "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
echo "   Neon:     $NEON_TABLES tables"
echo "   Supabase: $SUPABASE_TABLES tables"
echo ""

echo "3. Extensions:"
echo "   Neon extensions:"
run_query "$NEON_CONN" "SELECT extname FROM pg_extension ORDER BY extname;" | sed 's/^/     - /'
echo ""
echo "   Supabase extensions:"
run_query "$SUPABASE_CONN" "SELECT extname FROM pg_extension ORDER BY extname;" | sed 's/^/     - /'
echo ""

echo "4. Table List Comparison:"
echo "   Tables in Neon:"
run_query "$NEON_CONN" "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" | sed 's/^/     - /'
echo ""
echo "   Tables in Supabase:"
run_query "$SUPABASE_CONN" "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" | sed 's/^/     - /'
echo ""

echo "=== Validation Complete ==="
