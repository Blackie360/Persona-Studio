import { Pool } from 'pg'

// Neon connection (source)
const NEON_CONN = 'postgresql://neondb_owner:npg_Byxf6gZ8JeMU@ep-broad-rain-a4nc7o10-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

const neonPool = new Pool({ 
  connectionString: NEON_CONN,
  ssl: { rejectUnauthorized: false }
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
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName])
  return result.rows.map((row: any) => row.column_name)
}

async function generateInsertSQL(tableName: string, data: any[], columns: string[]): Promise<string[]> {
  if (data.length === 0) return []
  
  const sqlStatements: string[] = []
  const batchSize = 100
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const values: any[] = []
    const placeholders: string[] = []
    
    batch.forEach((row, rowIdx) => {
      const rowPlaceholders: string[] = []
      columns.forEach((col, colIdx) => {
        const paramIdx = rowIdx * columns.length + colIdx + 1
        rowPlaceholders.push(`$${paramIdx}`)
        values.push(row[col] ?? null)
      })
      placeholders.push(`(${rowPlaceholders.join(', ')})`)
    })
    
    const columnList = columns.map(c => `"${c}"`).join(', ')
    const sql = `INSERT INTO "${tableName}" (${columnList}) VALUES ${placeholders.join(', ')} ON CONFLICT DO NOTHING`
    
    sqlStatements.push(JSON.stringify({ sql, values }))
  }
  
  return sqlStatements
}

async function main() {
  console.log('🚀 Preparing data export from Neon for Supabase MCP migration\n')
  
  try {
    // Test Neon connection
    console.log('🔌 Testing Neon connection...')
    await neonPool.query('SELECT 1')
    console.log('   ✅ Neon connection OK\n')
    
    // Get tables
    console.log('📋 Discovering tables...')
    const tables = await getTables(neonPool)
    console.log(`   Found ${tables.length} tables: ${tables.join(', ')}\n`)
    
    // Export data for each table
    const exports: Record<string, { columns: string[], data: any[], sql: string[] }> = {}
    
    for (const table of tables) {
      console.log(`📦 Exporting ${table}...`)
      const columns = await getTableColumns(neonPool, table)
      const data = await getTableData(neonPool, table)
      const sql = await generateInsertSQL(table, data, columns)
      
      exports[table] = { columns, data, sql }
      console.log(`   ✅ Exported ${data.length} rows, ${sql.length} SQL statements\n`)
    }
    
    // Write SQL files for each table
    const fs = require('fs')
    const migrationDir = `migration-sql-${Date.now()}`
    fs.mkdirSync(migrationDir, { recursive: true })
    
    for (const [table, exportData] of Object.entries(exports)) {
      if (exportData.sql.length > 0) {
        const sqlFile = `${migrationDir}/${table}.sql`
        const sqlContent = exportData.sql.map(s => {
          const parsed = JSON.parse(s)
          // Format as parameterized query that can be executed
          return `-- ${table}: ${exportData.data.length} rows\n${parsed.sql};\n`
        }).join('\n')
        fs.writeFileSync(sqlFile, sqlContent)
        console.log(`   📄 Wrote ${sqlFile}`)
      }
    }
    
    console.log(`\n✨ Export completed!`)
    console.log(`📁 SQL files written to: ${migrationDir}/`)
    console.log(`\nReady to migrate using Supabase MCP tools!`)
    
    // Print summary
    console.log(`\n📊 Summary:`)
    for (const [table, exportData] of Object.entries(exports)) {
      console.log(`   ${table}: ${exportData.data.length} rows`)
    }
    
  } catch (error: any) {
    console.error('\n❌ Export failed:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await neonPool.end()
  }
}

main()
