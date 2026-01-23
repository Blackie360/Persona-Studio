# Neon to Supabase Migration Guide

## Overview
This migration moves your database from Neon to Supabase using pg_dump/pg_restore.

## Connection Strings

### Source (Neon)
```
postgresql://neondb_owner:npg_Byxf6gZ8JeMU@ep-broad-rain-a4nc7o10-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Destination (Supabase)
```
postgresql://postgres:eAQLdIlYTwPhCVnS@db.bfqckayblrkwcrmgukri.supabase.co:5432/postgres
```

## Creating a Branch in Neon

To create a branch in Neon for testing the migration:

1. **Identify your Neon project ID**: The connection string endpoint `ep-broad-rain-a4nc7o10-pooler.us-east-1.aws.neon.tech` suggests your project is in us-east-1 region.

2. **Using Neon Console** (Recommended):
   - Go to https://console.neon.tech
   - Select your project
   - Click "Branches" → "Create Branch"
   - Name it `migration-to-supabase`
   - This creates a safe copy of your database for testing

3. **Using Neon MCP** (requires cost confirmation):
   - First get cost: `mcp_Neon_get_cost(type: "branch", organization_id: "...")`
   - Confirm cost: `mcp_Neon_confirm_cost(...)`
   - Then create branch: `mcp_Neon_create_branch(project_id: "...", name: "...", confirm_cost_id: "...")`

**Note**: Branch creation may incur costs. Check Neon pricing before creating branches.

## Migration Steps

### Option 1: Using PostgreSQL Client Tools (Recommended)

If you have `pg_dump` and `psql` installed:

```bash
./migrate-neon-to-supabase.sh
```

### Option 2: Using Docker

If you don't have PostgreSQL client tools installed:

```bash
./migrate-neon-to-supabase-docker.sh
```

### Manual Steps

1. **Create dump from Neon**:
   ```bash
   pg_dump "postgresql://neondb_owner:npg_Byxf6gZ8JeMU@ep-broad-rain-a4nc7o10-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" \
     --clean --if-exists --no-owner --no-acl \
     --file=neon-dump.sql
   ```

2. **Restore to Supabase**:
   ```bash
   psql "postgresql://postgres:eAQLdIlYTwPhCVnS@db.bfqckayblrkwcrmgukri.supabase.co:5432/postgres" \
     -f neon-dump.sql
   ```

## Post-Migration Steps

1. **Verify Data Integrity**:
   - Compare table counts between Neon and Supabase
   - Run sample queries to verify data
   - Check for any missing extensions or functions

2. **Update Application Configuration**:
   - Update connection strings in your application
   - Update environment variables
   - Test application functionality

3. **Handle Extensions**:
   - Check if any PostgreSQL extensions need to be enabled in Supabase
   - Some extensions may need to be requested/enabled via Supabase dashboard

4. **Update Ownership**:
   - The `--no-owner` and `--no-acl` flags ensure compatibility
   - You may need to adjust permissions in Supabase if needed

## Troubleshooting

### Common Issues

1. **Connection Timeout**: Ensure both databases are accessible from your network
2. **Extension Errors**: Some extensions may not be available in Supabase
3. **Permission Errors**: Check that the Supabase user has necessary permissions
4. **Schema Conflicts**: Use `--clean --if-exists` flags to handle existing objects

### Verification Queries

```sql
-- Count tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check extensions
SELECT * FROM pg_extension;
```

## Notes

- This is an **offline migration**: Stop writes to Neon during the dump to avoid data drift
- The migration scripts create backups in `./migration-backup/` directory
- Always verify the migration before switching production traffic
- Consider testing the migration on a Supabase branch first
