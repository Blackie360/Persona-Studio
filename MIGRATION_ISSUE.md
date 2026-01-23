# Migration Issue: IPv6 Connectivity

## Problem
The Supabase database hostname (`db.bfqckayblrkwcrmgukri.supabase.co`) resolves only to an IPv6 address, but the current system cannot reach IPv6 addresses (ENETUNREACH error).

## Solutions

### Option 1: Run Migration from a Machine with IPv6/IPv4 Connectivity
Run the migration script from a machine that has:
- IPv6 connectivity enabled, OR
- DNS that resolves Supabase to IPv4

```bash
pnpm tsx migrate.ts
```

### Option 2: Use Supabase Connection Pooler (IPv4)
Try using Supabase's connection pooler which may have IPv4 support. Update the connection string in `migrate.ts`:

```typescript
const SUPABASE_CONN = 'postgresql://postgres.bfqckayblrkwcrmgukri:eAQLdIlYTwPhCVnS@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
```

### Option 3: Use pg_dump/pg_restore (if available)
If you have PostgreSQL client tools installed on a machine with proper connectivity:

```bash
# Dump from Neon
pg_dump "postgresql://neondb_owner:npg_Byxf6gZ8JeMU@ep-broad-rain-a4nc7o10-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  --clean --if-exists --no-owner --no-acl \
  --file=neon-dump.sql

# Restore to Supabase  
psql "postgresql://postgres:eAQLdIlYTwPhCVnS@db.bfqckayblrkwcrmgukri.supabase.co:5432/postgres" \
  -f neon-dump.sql
```

### Option 4: Use Supabase Dashboard SQL Editor
1. Export data from Neon using the Neon console SQL editor
2. Import data into Supabase using the Supabase dashboard SQL editor

### Option 5: Enable IPv6 on Your System
If you have control over the system, enable IPv6 connectivity:
- Check IPv6 configuration: `ip -6 addr`
- Enable IPv6 if disabled in network configuration

## Current Status
- ✅ Neon connection: Working
- ❌ Supabase connection: Blocked by IPv6 connectivity issue
- ✅ Migration script: Ready (`migrate.ts`)
- ✅ Git branch: Created (`migrate-neon-to-supabase`)

## Next Steps
1. Choose one of the solutions above
2. Run the migration from an environment with proper network connectivity
3. Verify the migration using `validate-migration.sh`
