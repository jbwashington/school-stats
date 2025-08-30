#!/usr/bin/env bun

/**
 * Copy Athletic Staff from NCRA Database to School Stats Database
 * Handles photo URLs and NCAA ID mapping
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase/database.types';

// School Stats database (current project)
const schoolStatsSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// NCRA database (source - we'll need these credentials)
const ncraSupabase = createClient(
  process.env.NCRA_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NCRA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NCRAStaffMember {
  id: number;
  school_id: number;
  name: string;
  title?: string;
  sport?: string;
  sport_category?: string;
  email?: string;
  phone?: string;
  bio?: string;
  photo_url?: string;
  scraping_method?: string;
  confidence_score?: number;
  contact_priority?: number;
  recruiting_coordinator?: boolean;
  created_at: string;
  updated_at: string;
}

interface SchoolMapping {
  ncra_school_id: number;
  ncaa_school_id: number;
  school_name: string;
}

async function createPhotoUrlColumn() {
  console.log('🔧 Adding photo_url column to athletic_staff table...');
  
  // Try to add the column using a simple INSERT operation that will fail, 
  // then we can catch the error and see the schema
  try {
    const { error } = await schoolStatsSupabase
      .from('athletic_staff')
      .insert({
        name: 'temp',
        photo_url: 'temp' // This will fail if column doesn't exist
      });
      
    if (error && error.message.includes('column "photo_url" of relation "athletic_staff" does not exist')) {
      console.log('❌ photo_url column does not exist - need manual schema update');
      console.log('🔧 Please run this SQL manually in your database:');
      console.log('   ALTER TABLE athletic_staff ADD COLUMN photo_url TEXT;');
      return false;
    } else {
      // Clean up the test record
      await schoolStatsSupabase
        .from('athletic_staff')
        .delete()
        .eq('name', 'temp');
      console.log('✅ photo_url column already exists');
      return true;
    }
  } catch (error) {
    console.error('❌ Error testing photo_url column:', error);
    return false;
  }
}

async function buildSchoolMapping(): Promise<SchoolMapping[]> {
  console.log('🔗 Building school ID mapping between NCRA and School Stats...');
  
  // Get schools from both databases
  const { data: ncraSchools } = await ncraSupabase
    .from('schools')
    .select('id, name, ncaa_id');
    
  const { data: schoolStatsSchools } = await schoolStatsSupabase
    .from('schools_ncaa_verified')
    .select('id, name, ncaa_id');
    
  if (!ncraSchools || !schoolStatsSchools) {
    console.error('❌ Could not fetch schools from one or both databases');
    return [];
  }
  
  const mappings: SchoolMapping[] = [];
  
  for (const ncraSchool of ncraSchools) {
    // First try exact NCAA ID match
    let matchedSchool = schoolStatsSchools.find(s => s.ncaa_id === ncraSchool.ncaa_id);
    
    // If no NCAA ID match, try name matching
    if (!matchedSchool) {
      matchedSchool = schoolStatsSchools.find(s => 
        s.name.toLowerCase() === ncraSchool.name.toLowerCase()
      );
    }
    
    // If still no match, try partial name matching
    if (!matchedSchool) {
      matchedSchool = schoolStatsSchools.find(s => 
        s.name.toLowerCase().includes(ncraSchool.name.toLowerCase()) ||
        ncraSchool.name.toLowerCase().includes(s.name.toLowerCase())
      );
    }
    
    if (matchedSchool) {
      mappings.push({
        ncra_school_id: ncraSchool.id,
        ncaa_school_id: matchedSchool.id,
        school_name: matchedSchool.name
      });
    }
  }
  
  console.log(`📊 Created ${mappings.length} school mappings out of ${ncraSchools.length} NCRA schools`);
  return mappings;
}

async function copyAthleticStaff(schoolMappings: SchoolMapping[]) {
  console.log('👥 Copying athletic staff from NCRA to School Stats database...');
  
  let totalCopied = 0;
  let totalWithPhotos = 0;
  let errorCount = 0;
  
  // Process in batches to avoid overwhelming the database
  const batchSize = 100;
  
  for (const mapping of schoolMappings) {
    try {
      // Get athletic staff for this school from NCRA database
      const { data: ncraStaff, error: fetchError } = await ncraSupabase
        .from('athletic_staff')
        .select('*')
        .eq('school_id', mapping.ncra_school_id);
        
      if (fetchError) {
        console.error(`❌ Error fetching staff for ${mapping.school_name}:`, fetchError.message);
        errorCount++;
        continue;
      }
      
      if (!ncraStaff || ncraStaff.length === 0) {
        continue;
      }
      
      console.log(`📥 Processing ${ncraStaff.length} staff members from ${mapping.school_name}`);
      
      // Transform NCRA staff to School Stats format
      const transformedStaff = ncraStaff.map((staff: any) => ({
        ncaa_school_id: mapping.ncaa_school_id,
        school_id: mapping.ncra_school_id, // Keep legacy reference
        name: staff.name,
        title: staff.title,
        sport: staff.sport || 'General Athletics',
        sport_category: staff.sport_category,
        email: staff.email,
        phone: staff.phone,
        bio: staff.bio,
        photo_url: staff.photo_url, // This is the key field we're adding
        scraping_method: staff.scraping_method || 'ncra_import',
        confidence_score: staff.confidence_score || 0.8,
        contact_priority: staff.contact_priority,
        recruiting_coordinator: staff.recruiting_coordinator,
        scraping_source: 'ncra_database',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Count staff with photos
      const staffWithPhotos = transformedStaff.filter(s => s.photo_url).length;
      totalWithPhotos += staffWithPhotos;
      
      // Insert in batches
      for (let i = 0; i < transformedStaff.length; i += batchSize) {
        const batch = transformedStaff.slice(i, i + batchSize);
        
        const { error: insertError } = await schoolStatsSupabase
          .from('athletic_staff')
          .insert(batch);
          
        if (insertError) {
          console.error(`❌ Error inserting batch for ${mapping.school_name}:`, insertError.message);
          errorCount++;
        } else {
          totalCopied += batch.length;
        }
      }
      
      console.log(`✅ Copied ${transformedStaff.length} staff (${staffWithPhotos} with photos) from ${mapping.school_name}`);
      
    } catch (error) {
      console.error(`❌ Unexpected error processing ${mapping.school_name}:`, error);
      errorCount++;
    }
  }
  
  return { totalCopied, totalWithPhotos, errorCount };
}

async function main() {
  try {
    console.log('🚀 NCRA Athletic Staff Migration to School Stats');
    console.log('=' .repeat(60));
    
    // Step 1: Ensure photo_url column exists
    const columnReady = await createPhotoUrlColumn();
    if (!columnReady) {
      console.log('\n❌ Cannot proceed without photo_url column');
      console.log('Please add the column manually and rerun this script');
      process.exit(1);
    }
    
    // Step 2: Build school mapping
    const schoolMappings = await buildSchoolMapping();
    if (schoolMappings.length === 0) {
      console.log('❌ No school mappings found - cannot proceed');
      process.exit(1);
    }
    
    // Step 3: Copy athletic staff data
    const results = await copyAthleticStaff(schoolMappings);
    
    console.log('\n📊 Migration Results:');
    console.log('=' .repeat(30));
    console.log(`✅ Staff members copied: ${results.totalCopied}`);
    console.log(`📸 Staff with photo URLs: ${results.totalWithPhotos}`);
    console.log(`❌ Errors encountered: ${results.errorCount}`);
    console.log(`🏫 Schools processed: ${schoolMappings.length}`);
    
    if (results.totalWithPhotos > 0) {
      const photoPercentage = ((results.totalWithPhotos / results.totalCopied) * 100).toFixed(1);
      console.log(`📈 Photo coverage: ${photoPercentage}%`);
    }
    
    console.log('\n✅ Athletic staff migration completed!');
    
    // Verify the migration
    const { count } = await schoolStatsSupabase
      .from('athletic_staff')
      .select('id', { count: 'exact', head: true });
      
    console.log(`🔍 Verification: ${count || 0} total staff records in School Stats database`);
    
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { copyAthleticStaff, buildSchoolMapping };