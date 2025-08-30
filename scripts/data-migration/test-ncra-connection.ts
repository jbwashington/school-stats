#!/usr/bin/env bun

/**
 * Test connection to NCRA Production Database
 * Use this to verify credentials and explore the database structure
 */

import { createClient } from '@supabase/supabase-js';

const ncraProductionUrl = process.env.NCRA_PRODUCTION_SUPABASE_URL || 'https://duuydbxwioydeawzssia.supabase.co';
const ncraProductionKey = process.env.NCRA_PRODUCTION_SERVICE_ROLE_KEY;

if (!ncraProductionKey) {
  console.error('❌ NCRA_PRODUCTION_SERVICE_ROLE_KEY environment variable is required');
  console.log('\nTo get the production service role key:');
  console.log('1. Go to your NCRA Supabase project dashboard');
  console.log('2. Navigate to Settings > API');
  console.log('3. Copy the service_role secret key');
  console.log('4. Run: export NCRA_PRODUCTION_SERVICE_ROLE_KEY="your_key_here"');
  console.log('5. Then run this script again');
  process.exit(1);
}

const ncraSupabase = createClient(
  ncraProductionUrl,
  ncraProductionKey
);

async function testConnection() {
  try {
    console.log('🔗 Testing NCRA Production Database Connection');
    console.log('=' .repeat(50));
    console.log(`📡 URL: ${ncraProductionUrl}`);
    console.log(`🔑 Key: ${ncraProductionKey.substring(0, 20)}...`);
    
    // Test basic connection
    const { data, error } = await ncraSupabase
      .from('profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful!');
    
    // Explore tables
    console.log('\n🔍 Exploring database tables...');
    
    const tablesToCheck = [
      'profiles',
      'schools',
      'school_profiles', 
      'athletic_staff',
      'coaches',
      'staff',
      'faculty',
      'athletic_coaches'
    ];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error, count } = await ncraSupabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(1);
          
        if (!error) {
          console.log(`✅ ${table}: ${count || 0} records`);
          if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log(`   📋 Sample columns: ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}`);
            
            // Look for photo columns
            const photoColumns = columns.filter(col => 
              col.includes('photo') || col.includes('image') || col.includes('picture')
            );
            if (photoColumns.length > 0) {
              console.log(`   📸 Photo columns: ${photoColumns.join(', ')}`);
            }
          }
        }
      } catch (e) {
        // Table doesn't exist, skip
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Error:', error);
    return false;
  }
}

async function main() {
  const success = await testConnection();
  
  if (success) {
    console.log('\n🚀 Ready to run the full migration!');
    console.log('Run: bun scripts/data-migration/copy-from-ncra-production.ts');
  } else {
    console.log('\n❌ Fix connection issues before running the migration');
  }
}

if (import.meta.main) {
  main();
}