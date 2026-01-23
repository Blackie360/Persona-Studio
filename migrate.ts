import { Pool } from 'pg'

const NEON_CONN = 'postgresql://neondb_owner:npg_Byxf6gZ8JeMU@ep-broad-rain-a4nc7o10-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
// Try using pooler port which might have IPv4 support
const SUPABASE_CONN = 'postgresql://postgres.eAQLdIlYTwPhCVnS@db.bfqckayblrkwcrmgukri.supabase.co:6543/postgres?sslmode=require'

const neonPool = new Pool({ 
  connectionString: NEON_CONN,
  ssl: { rejectUnauthorized: false }
})

// Use pooler connection string format for Supabase
const supabasePool = new Pool({ 
  connectionString: SUPABASE_CONN,
  ssl: { rejectUnauthorized: false },
  // Try to force IPv4 resolution
  connectionTimeoutMillis: 10000
})

async function getTables(pool: Pool): Promise<string[]> {
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)
  return result.rows.map((row: any) => row.table_name)
}

async function getTableData(pool: Pool, tableName: string): Promise<any[]> {
  const result = await pool.query(`SELECT * FROM "${tableName}"`)
  return result.rows
}

async function getTableColumns(pool: Pool, tableName: string): Promise<string[]> {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName])
  return result.rows
}

async function migrateTable(tableName: string) {
  console.log(`\n📦 Migrating table: ${tableName}`)
  
  // Get data from Neon
  const data = await getTableData(neonPool, tableName)
  console.log(`   Found ${data.length} rows in Neon`)
  
  if (data.length === 0) {
    console.log(`   ⏭️  Skipping empty table`)
    return
  }
  
  // Get column info
  const columns = await getTableColumns(neonPool, tableName)
  const columnNames = columns.map((col: any) => col.column_name)
  
  // Check if table exists in Supabase
  const supabaseTables = await getTables(supabasePool)
  const tableExists = supabaseTables.includes(tableName)
  
  if (!tableExists) {
    console.log(`   ⚠️  Table ${tableName} does not exist in Supabase. Skipping data migration.`)
    console.log(`   💡 You may need to run schema migrations first (drizzle-kit push)`)
    return
  }
  
  // Clear existing data (optional - comment out if you want to append)
  try {
    await supabasePool.query(`TRUNCATE TABLE "${tableName}" CASCADE`)
    console.log(`   🗑️  Cleared existing data in Supabase`)
  } catch (error: any) {
    console.log(`   ⚠️  Could not truncate (may have foreign key constraints): ${error.message}`)
  }
  
  // Insert data in batches
  const batchSize = 100
  let inserted = 0
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    
    const placeholders = batch.map((_, idx) => {
      const rowPlaceholders = columnNames.map((_, colIdx) => 
        `$${idx * columnNames.length + colIdx + 1}`
      ).join(', ')
      return `(${rowPlaceholders})`
    }).join(', ')
    
    const values = batch.flatMap(row => 
      columnNames.map(col => row[col] ?? null)
    )
    
    const query = `INSERT INTO "${tableName}" (${columnNames.map(c => `"${c}"`).join(', ')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`
    
    try {
      await supabasePool.query(query, values)
      inserted += batch.length
      console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted}/${data.length} rows)`)
    } catch (error: any) {
      console.error(`   ❌ Error inserting batch: ${error.message}`)
      throw error
    }
  }
  
  console.log(`   ✨ Successfully migrated ${inserted} rows`)
}

async function main() {
  console.log('🚀 Starting migration from Neon to Supabase\n')
  
  try {
    // Test connections
    console.log('🔌 Testing connections...')
    await neonPool.query('SELECT 1')
    console.log('   ✅ Neon connection OK')
    await supabasePool.query('SELECT 1')
    console.log('   ✅ Supabase connection OK')
    
    // Get tables
    console.log('\n📋 Discovering tables...')
    const tables = await getTables(neonPool)
    console.log(`   Found ${tables.length} tables: ${tables.join(', ')}`)
    
    // Migrate each table
    for (const table of tables) {
      await migrateTable(table)
    }
    
    console.log('\n✨ Migration completed successfully!')
    
    // Verify
    console.log('\n🔍 Verification:')
    const neonCounts: Record<string, number> = {}
    const supabaseCounts: Record<string, number> = {}
    
    for (const table of tables) {
      const neonResult = await neonPool.query(`SELECT COUNT(*) FROM "${table}"`)
      const supabaseResult = await supabasePool.query(`SELECT COUNT(*) FROM "${table}"`)
      neonCounts[table] = parseInt(neonResult.rows[0].count)
      supabaseCounts[table] = parseInt(supabaseResult.rows[0].count)
    }
    
    console.log('\nRow counts comparison:')
    for (const table of tables) {
      const neonCount = neonCounts[table]
      const supabaseCount = supabaseCounts[table]
      const match = neonCount === supabaseCount ? '✅' : '❌'
      console.log(`   ${match} ${table}: Neon=${neonCount}, Supabase=${supabaseCount}`)
    }
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await neonPool.end()
    await supabasePool.end()
  }
}

main()
