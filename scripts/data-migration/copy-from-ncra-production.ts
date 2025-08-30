#!/usr/bin/env bun

/**
 * Copy Athletic Staff from NCRA Production Database
 * Project ID: duuydbxwioydeawzssia
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase/database.types';

// School Stats database (current project)
const schoolStatsSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// NCRA Production database - we'll need the actual production credentials
const ncraProductionUrl = process.env.NCRA_PRODUCTION_SUPABASE_URL || 'https://duuydbxwioydeawzssia.supabase.co';
const ncraProductionKey = process.env.NCRA_PRODUCTION_SERVICE_ROLE_KEY;

if (!ncraProductionKey) {
  console.error('❌ NCRA_PRODUCTION_SERVICE_ROLE_KEY environment variable is required');
  console.log('Please set the NCRA production service role key:');
  console.log('export NCRA_PRODUCTION_SERVICE_ROLE_KEY="your_ncra_production_service_role_key"');
  process.exit(1);
}

const ncraSupabase = createClient(
  ncraProductionUrl,
  ncraProductionKey
);

interface NCRAStaff {
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
  ncaa_id?: string;
}

async function findAthleticStaffTables() {
  console.log('🔍 Discovering athletic staff tables in NCRA production...');
  
  const tablesToCheck = [
    'athletic_staff', 
    'coaches', 
    'staff', 
    'faculty',
    'athletic_coaches',
    'coach_profiles',
    'staff_members',
    'athletic_staff_members'
  ];
  
  const foundTables = [];
  
  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await ncraSupabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
        
      if (!error && count !== null) {
        foundTables.push({
          table,
          count,
          sample: data && data.length > 0 ? data[0] : null
        });
        console.log(`✅ Found '${table}' with ${count} records`);
        
        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`   Columns: ${columns.join(', ')}`);
          
          // Check for photo columns
          const photoColumns = columns.filter(col => 
            col.includes('photo') || col.includes('image') || col.includes('picture')
          );
          if (photoColumns.length > 0) {
            console.log(`   📸 Photo columns: ${photoColumns.join(', ')}`);
          }
        }
      }
    } catch (e) {
      // Table doesn't exist, ignore
    }
  }
  
  return foundTables;
}

// Enhanced school name normalization based on NCAA naming patterns
function normalizeSchoolName(name: string): string {
  if (!name) return '';
  
  let normalized = name.trim();
  
  // Handle flagship campus patterns - NCAA uses the main campus name without city
  // "University of [State], [City]" -> "University of [State]"
  normalized = normalized.replace(/^(University of [^,]+),\s*[^,]+$/i, '$1');
  
  // "University of [State]-[City]" -> "University of [State]" (for main campus)
  const flagshipPatterns = [
    { pattern: /^University of Wisconsin-Madison$/i, replacement: 'University of Wisconsin' },
    { pattern: /^University of Illinois Urbana-Champaign$/i, replacement: 'University of Illinois' },
    { pattern: /^University of Tennessee,?\s*Knoxville$/i, replacement: 'University of Tennessee' },
  ];
  
  for (const { pattern, replacement } of flagshipPatterns) {
    if (pattern.test(normalized)) {
      normalized = replacement;
      break;
    }
  }
  
  // Handle formal institution names -> common names
  // "Rutgers, The State University of New Jersey, New Brunswick" -> "Rutgers University"
  if (/^Rutgers,\s*The State University/i.test(normalized)) {
    normalized = 'Rutgers University';
  }
  
  // "[University]-[College/School]" -> "[University]" (remove specific college references)
  normalized = normalized.replace(/^([^-]+)-[A-Za-z\s]+College$/i, '$1');
  
  // Remove extra whitespace and normalize
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

// Enhanced fuzzy matching for institutional names
function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeSchoolName(name1).toLowerCase();
  const n2 = normalizeSchoolName(name2).toLowerCase();
  
  // Exact match after normalization
  if (n1 === n2) return 1.0;
  
  // Check if one contains the other (for partial matches)
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;
  
  // Extract key words and compare
  const words1 = n1.split(/\s+/).filter(w => w.length > 2);
  const words2 = n2.split(/\s+/).filter(w => w.length > 2);
  
  const commonWords = words1.filter(w1 => 
    words2.some(w2 => w1.includes(w2) || w2.includes(w1))
  );
  
  const similarity = (commonWords.length * 2) / (words1.length + words2.length);
  return similarity;
}

async function buildSchoolMapping(): Promise<SchoolMapping[]> {
  console.log('🔗 Building school mapping between NCRA and School Stats...');
  console.log('📏 Using NCAA as source of truth for school names and structure');
  
  // Try different school table names in NCRA
  let ncraSchools = null;
  const schoolTableNames = ['schools', 'school_profiles', 'schools_ncaa_verified', 'institutions'];
  
  for (const tableName of schoolTableNames) {
    try {
      const { data } = await ncraSupabase
        .from(tableName)
        .select('*')
        .limit(5);
        
      if (data && data.length > 0) {
        console.log(`✅ Found schools in table: ${tableName}`);
        console.log(`   Sample columns: ${Object.keys(data[0]).join(', ')}`);
        
        // Get all schools from this table
        const { data: allSchools } = await ncraSupabase
          .from(tableName)
          .select('*');
          
        ncraSchools = allSchools;
        break;
      }
    } catch (e) {
      // Table doesn't exist, continue
    }
  }
  
  if (!ncraSchools) {
    console.log('❌ Could not find schools table in NCRA database');
    return [];
  }
  
  // Get schools from School Stats (NCAA authoritative source)
  const { data: schoolStatsSchools } = await schoolStatsSupabase
    .from('schools_ncaa_verified')
    .select('id, name, ncaa_id');
    
  if (!schoolStatsSchools) {
    console.log('❌ Could not fetch schools from School Stats database');
    return [];
  }
  
  const mappings: SchoolMapping[] = [];
  let exactMatches = 0;
  let normalizedMatches = 0;
  let fuzzyMatches = 0;
  
  for (const ncraSchool of ncraSchools) {
    const ncraName = ncraSchool.name || ncraSchool.school_name || '';
    let matchedSchool = null;
    let matchType = '';
    
    // 1. Try to match by NCAA ID first (if available)
    if (ncraSchool.ncaa_id) {
      matchedSchool = schoolStatsSchools.find(s => 
        s.ncaa_id === ncraSchool.ncaa_id
      );
      if (matchedSchool) matchType = 'ncaa_id';
    }
    
    // 2. Try exact name match
    if (!matchedSchool) {
      matchedSchool = schoolStatsSchools.find(s => 
        s.name.toLowerCase() === ncraName.toLowerCase()
      );
      if (matchedSchool) {
        matchType = 'exact';
        exactMatches++;
      }
    }
    
    // 3. Try normalized name match (flagship campus patterns)
    if (!matchedSchool) {
      const normalizedNcraName = normalizeSchoolName(ncraName);
      matchedSchool = schoolStatsSchools.find(s => 
        normalizeSchoolName(s.name).toLowerCase() === normalizedNcraName.toLowerCase()
      );
      if (matchedSchool) {
        matchType = 'normalized';
        normalizedMatches++;
        console.log(`🔗 Normalized match: "${ncraName}" -> "${matchedSchool.name}"`);
      }
    }
    
    // 4. Try fuzzy matching with similarity threshold
    if (!matchedSchool) {
      let bestMatch = null;
      let bestSimilarity = 0;
      
      for (const ncaaSchool of schoolStatsSchools) {
        const similarity = calculateNameSimilarity(ncraName, ncaaSchool.name);
        if (similarity > bestSimilarity && similarity >= 0.7) {
          bestSimilarity = similarity;
          bestMatch = ncaaSchool;
        }
      }
      
      if (bestMatch) {
        matchedSchool = bestMatch;
        matchType = `fuzzy_${bestSimilarity.toFixed(2)}`;
        fuzzyMatches++;
        console.log(`🔗 Fuzzy match (${bestSimilarity.toFixed(2)}): "${ncraName}" -> "${matchedSchool.name}"`);
      }
    }
    
    if (matchedSchool) {
      mappings.push({
        ncra_school_id: ncraSchool.id,
        ncaa_school_id: matchedSchool.id,
        school_name: matchedSchool.name, // Use NCAA name as source of truth
        ncaa_id: matchedSchool.ncaa_id
      });
    } else {
      // Log unmapped schools for analysis
      console.log(`⚠️  Unmapped school: "${ncraName}" (NCRA ID: ${ncraSchool.id})`);
    }
  }
  
  console.log(`📊 Created ${mappings.length} school mappings out of ${ncraSchools.length} NCRA schools`);
  console.log(`   - Exact matches: ${exactMatches}`);
  console.log(`   - Normalized matches: ${normalizedMatches} (flagship campus patterns)`);
  console.log(`   - Fuzzy matches: ${fuzzyMatches} (similarity >= 0.7)`);
  console.log(`   - NCAA names used as authoritative source`);
  
  return mappings;
}

async function copyAthleticStaffData(tableName: string, schoolMappings: SchoolMapping[]) {
  console.log(`👥 Copying athletic staff from NCRA table: ${tableName}`);
  
  let totalCopied = 0;
  let totalWithPhotos = 0;
  let errorCount = 0;
  let allStaff: any[] = [];
  
  // Get total count first
  const { count } = await ncraSupabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });
    
  console.log(`📊 Total staff records in NCRA: ${count || 0}`);
  
  // Fetch all records using pagination
  const pageSize = 1000;
  let currentPage = 0;
  
  while (true) {
    console.log(`📥 Fetching page ${currentPage + 1} (${currentPage * pageSize + 1}-${(currentPage + 1) * pageSize})...`);
    
    const { data: pageData, error } = await ncraSupabase
      .from(tableName)
      .select('*')
      .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);
      
    if (error) {
      console.error(`❌ Error fetching page ${currentPage + 1}:`, error);
      errorCount++;
      break;
    }
    
    if (!pageData || pageData.length === 0) {
      console.log(`📊 Finished fetching all pages. Total records: ${allStaff.length}`);
      break;
    }
    
    allStaff.push(...pageData);
    console.log(`✅ Fetched ${pageData.length} records (Total: ${allStaff.length})`);
    
    // If we got less than pageSize, we're done
    if (pageData.length < pageSize) {
      break;
    }
    
    currentPage++;
  }
  
  console.log(`📊 Found ${allStaff.length} total staff records in NCRA`);
  
  // Process staff in batches
  const batchSize = 50;
  
  for (let i = 0; i < allStaff.length; i += batchSize) {
    const batch = allStaff.slice(i, i + batchSize);
    
    const transformedStaff = batch.map((staff: any) => {
      // Find the school mapping
      const mapping = schoolMappings.find(m => m.ncra_school_id === staff.school_id);
      
      if (!mapping) {
        console.log(`⚠️ No school mapping found for NCRA school_id: ${staff.school_id}`);
        return null;
      }
      
      return {
        ncaa_school_id: mapping.ncaa_school_id,
        school_id: staff.school_id, // Keep legacy reference
        name: staff.name,
        title: staff.title,
        sport: staff.sport || 'General Athletics',
        sport_category: staff.sport_category,
        email: staff.email,
        phone: staff.phone,
        bio: staff.bio,
        photo_url: staff.photo_url, // This is the key field!
        scraping_method: staff.scraping_method || 'ncra_import',
        confidence_score: staff.confidence_score || 0.8,
        contact_priority: staff.contact_priority,
        recruiting_coordinator: staff.recruiting_coordinator,
        scraping_source: 'ncra_production',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }).filter(Boolean); // Remove null entries
    
    if (transformedStaff.length === 0) {
      continue;
    }
    
    // Count photos in this batch
    const batchWithPhotos = transformedStaff.filter(s => s.photo_url && s.photo_url.trim() !== '').length;
    totalWithPhotos += batchWithPhotos;
    
    // Insert batch
    const { error: insertError } = await schoolStatsSupabase
      .from('athletic_staff')
      .insert(transformedStaff);
      
    if (insertError) {
      console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, insertError.message);
      errorCount++;
    } else {
      totalCopied += transformedStaff.length;
      console.log(`✅ Copied batch ${Math.floor(i/batchSize) + 1}: ${transformedStaff.length} staff (${batchWithPhotos} with photos)`);
    }
  }
  
  return { totalCopied, totalWithPhotos, errorCount };
}

async function main() {
  try {
    console.log('🚀 NCRA Production → School Stats Athletic Staff Migration');
    console.log('=' .repeat(70));
    
    // Step 1: Test connection to NCRA production
    console.log('🔗 Testing connection to NCRA production database...');
    try {
      const { data, error } = await ncraSupabase
        .from('profiles')
        .select('id')
        .limit(1);
        
      if (error) {
        console.error('❌ Could not connect to NCRA production database:', error.message);
        process.exit(1);
      }
      console.log('✅ Connected to NCRA production database');
    } catch (error) {
      console.error('❌ Connection error:', error);
      process.exit(1);
    }
    
    // Step 2: Find athletic staff tables
    const tables = await findAthleticStaffTables();
    if (tables.length === 0) {
      console.log('❌ No athletic staff tables found in NCRA production');
      process.exit(1);
    }
    
    // Step 3: Build school mapping
    const schoolMappings = await buildSchoolMapping();
    if (schoolMappings.length === 0) {
      console.log('❌ No school mappings found - cannot proceed');
      process.exit(1);
    }
    
    // Step 4: Copy data from the table with the most records
    const largestTable = tables.reduce((max, current) => 
      current.count > max.count ? current : max
    );
    
    console.log(`\n📊 Using table '${largestTable.table}' with ${largestTable.count} records`);
    
    const results = await copyAthleticStaffData(largestTable.table, schoolMappings);
    
    console.log('\n📊 Migration Results:');
    console.log('=' .repeat(35));
    console.log(`✅ Staff members copied: ${results.totalCopied}`);
    console.log(`📸 Staff with photo URLs: ${results.totalWithPhotos}`);
    console.log(`❌ Errors encountered: ${results.errorCount}`);
    console.log(`🏫 School mappings used: ${schoolMappings.length}`);
    
    if (results.totalWithPhotos > 0) {
      const photoPercentage = ((results.totalWithPhotos / results.totalCopied) * 100).toFixed(1);
      console.log(`📈 Photo coverage: ${photoPercentage}%`);
    }
    
    console.log('\n✅ NCRA production migration completed!');
    
    // Verify results
    const { count } = await schoolStatsSupabase
      .from('athletic_staff')
      .select('id', { count: 'exact', head: true });
      
    console.log(`🔍 Verification: ${count || 0} total staff records now in School Stats database`);
    
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { copyAthleticStaffData, buildSchoolMapping };