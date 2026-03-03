import { createClient } from '@supabase/supabase-js'

/**
 * Test Supabase database connection
 * Run this file with: node src/test-db-connection.js
 * (Make sure to set environment variables first)
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Missing environment variables')
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  console.error('\nExample:')
  console.error('export VITE_SUPABASE_URL=https://your-project.supabase.co')
  console.error('export VITE_SUPABASE_ANON_KEY=your-anon-key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🧪 Testing Supabase Connection...\n')

async function testConnection() {
  try {
    // Test 1: Basic connectivity
    console.log('1️⃣ Testing basic connectivity...')
    const { data: health, error: healthError } = await supabase.from('flocks').select('count', { count: 'exact', head: true })
    
    if (healthError) {
      throw new Error(`Connection failed: ${healthError.message}`)
    }
    console.log('   ✅ Connection successful')

    // Test 2: Check flocks table
    console.log('2️⃣ Checking flocks table...')
    const { data: flocks, error: flocksError } = await supabase.from('flocks').select('*').limit(1)
    if (flocksError) {
      console.log(`   ⚠️  Flocks table error: ${flocksError.message}`)
    } else {
      console.log(`   ✅ Flocks table accessible (${flocks.length} records found)`)
    }

    // Test 3: Check daily_records table
    console.log('3️⃣ Checking daily_records table...')
    const { data: records, error: recordsError } = await supabase.from('daily_records').select('*').limit(1)
    if (recordsError) {
      console.log(`   ⚠️  Daily records table error: ${recordsError.message}`)
    } else {
      console.log(`   ✅ Daily records table accessible (${records.length} records found)`)
    }

    // Test 4: Check finances table
    console.log('4️⃣ Checking finances table...')
    const { data: finances, error: financesError } = await supabase.from('finances').select('*').limit(1)
    if (financesError) {
      console.log(`   ⚠️  Finances table error: ${financesError.message}`)
    } else {
      console.log(`   ✅ Finances table accessible (${finances.length} records found)`)
    }

    // Test 5: Try inserting test data
    console.log('5️⃣ Testing insert operation...')
    const testData = {
      type: 'Hen',
      quantity: 1,
      date_added: new Date().toISOString().split('T')[0],
      status: 'active'
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('flocks')
      .insert([testData])
      .select()
    
    if (insertError) {
      console.log(`   ⚠️  Insert test failed: ${insertError.message}`)
    } else {
      console.log('   ✅ Insert operation successful')
      
      // Clean up test data
      if (insertData && insertData[0]) {
        await supabase.from('flocks').delete().eq('id', insertData[0].id)
        console.log('   ✅ Test data cleaned up')
      }
    }

    console.log('\n✅ All tests completed!')
    console.log('\n📋 Next steps:')
    console.log('   - Run npm run dev to start the development server')
    console.log('   - Open http://localhost:5173 in your browser')
    console.log('   - Check browser console for connection status')

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`)
    console.error('\n💡 Troubleshooting tips:')
    console.error('   1. Verify your Supabase URL is correct')
    console.error('   2. Check that your anon key is valid')
    console.error('   3. Ensure the database tables are created (run the SQL migration)')
    console.error('   4. Check Row Level Security (RLS) policies if enabled')
    process.exit(1)
  }
}

testConnection()