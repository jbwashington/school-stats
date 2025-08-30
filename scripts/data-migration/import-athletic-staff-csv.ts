#!/usr/bin/env bun

/**
 * Import Athletic Staff from CSV with Photo URLs
 * Alternative approach if NCRA database isn't directly accessible
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import type { Database } from '../../lib/supabase/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CSVStaffMember {
  school_name: string;
  ncaa_id?: string;
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
}

function parseCSV(csvContent: string): CSVStaffMember[] {
  const lines = csvContent.split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const staffMembers: CSVStaffMember[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const staffMember: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index] || '';
      
      // Handle different column name variations
      const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_');
      
      switch (normalizedHeader) {
        case 'school_name':
        case 'school':
        case 'institution':
          staffMember.school_name = value;
          break;
        case 'ncaa_id':
        case 'ncaa_school_id':
          staffMember.ncaa_id = value;
          break;
        case 'name':
        case 'full_name':
        case 'coach_name':
          staffMember.name = value;
          break;
        case 'title':
        case 'position':
        case 'role':
          staffMember.title = value;
          break;
        case 'sport':
        case 'sports':
          staffMember.sport = value || 'General Athletics';
          break;
        case 'sport_category':
        case 'category':
          staffMember.sport_category = value;
          break;
        case 'email':
        case 'email_address':
          staffMember.email = value;
          break;
        case 'phone':
        case 'phone_number':
          staffMember.phone = value;
          break;
        case 'bio':
        case 'biography':
        case 'description':
          staffMember.bio = value;
          break;
        case 'photo_url':
        case 'image_url':
        case 'picture_url':
        case 'headshot_url':
          staffMember.photo_url = value;
          break;
        case 'scraping_method':
        case 'source':
          staffMember.scraping_method = value;
          break;
        case 'confidence_score':
        case 'confidence':
          staffMember.confidence_score = parseFloat(value) || 0.8;
          break;
        case 'contact_priority':
        case 'priority':
          staffMember.contact_priority = parseInt(value) || null;
          break;
        case 'recruiting_coordinator':
        case 'is_recruiter':
          staffMember.recruiting_coordinator = value.toLowerCase() === 'true' || value === '1';
          break;
      }
    });
    
    if (staffMember.name && staffMember.school_name) {
      staffMembers.push(staffMember);
    }
  }
  
  return staffMembers;
}

async function findSchoolByName(schoolName: string): Promise<number | null> {
  // Try exact match first
  let { data } = await supabase
    .from('schools_ncaa_verified')
    .select('id')
    .ilike('name', schoolName)
    .limit(1);
    
  if (data && data.length > 0) {
    return data[0].id;
  }
  
  // Try partial match
  const { data: partialMatch } = await supabase
    .from('schools_ncaa_verified')
    .select('id, name')
    .ilike('name', `%${schoolName}%`)
    .limit(5);
    
  if (partialMatch && partialMatch.length > 0) {
    console.log(`🔍 Partial matches for "${schoolName}":`, partialMatch.map(s => s.name));
    return partialMatch[0].id; // Return first match
  }
  
  return null;
}

async function importStaffFromCSV(csvFilePath: string) {
  console.log(`📥 Importing athletic staff from CSV: ${csvFilePath}`);
  
  if (!existsSync(csvFilePath)) {
    throw new Error(`CSV file not found: ${csvFilePath}`);
  }
  
  const csvContent = readFileSync(csvFilePath, 'utf-8');
  const staffMembers = parseCSV(csvContent);
  
  console.log(`📊 Parsed ${staffMembers.length} staff members from CSV`);
  
  let imported = 0;
  let withPhotos = 0;
  let errors = 0;
  let schoolNotFound = 0;
  
  for (const staff of staffMembers) {
    try {
      // Find the school ID
      const schoolId = await findSchoolByName(staff.school_name);
      
      if (!schoolId) {
        console.log(`⚠️ School not found: ${staff.school_name}`);
        schoolNotFound++;
        continue;
      }
      
      // Insert staff member
      const { error } = await supabase
        .from('athletic_staff')
        .insert({
          ncaa_school_id: schoolId,
          name: staff.name,
          title: staff.title,
          sport: staff.sport || 'General Athletics',
          sport_category: staff.sport_category,
          email: staff.email,
          phone: staff.phone,
          bio: staff.bio,
          photo_url: staff.photo_url,
          scraping_method: staff.scraping_method || 'csv_import',
          confidence_score: staff.confidence_score || 0.8,
          contact_priority: staff.contact_priority,
          recruiting_coordinator: staff.recruiting_coordinator,
          scraping_source: 'csv_import',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error(`❌ Error importing ${staff.name}:`, error.message);
        errors++;
      } else {
        imported++;
        if (staff.photo_url) {
          withPhotos++;
        }
        
        if (imported % 100 === 0) {
          console.log(`📈 Progress: ${imported} staff members imported`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Unexpected error importing ${staff.name}:`, error);
      errors++;
    }
  }
  
  return {
    total: staffMembers.length,
    imported,
    withPhotos,
    errors,
    schoolNotFound
  };
}

async function main() {
  try {
    console.log('🚀 Athletic Staff CSV Import');
    console.log('=' .repeat(40));
    
    const csvPath = process.argv[2] || './athletic-staff-export.csv';
    
    if (!existsSync(csvPath)) {
      console.log('❌ CSV file not found.');
      console.log('\nUsage: bun scripts/data-migration/import-athletic-staff-csv.ts [csv_file_path]');
      console.log('\nExpected CSV columns:');
      console.log('  - school_name (required)');
      console.log('  - name (required)');
      console.log('  - title');
      console.log('  - sport');
      console.log('  - email');
      console.log('  - phone');
      console.log('  - bio');
      console.log('  - photo_url (this is the key column we need)');
      console.log('  - scraping_method');
      console.log('  - confidence_score');
      console.log('  - contact_priority');
      console.log('  - recruiting_coordinator');
      process.exit(1);
    }
    
    const results = await importStaffFromCSV(csvPath);
    
    console.log('\n📊 Import Results:');
    console.log('=' .repeat(25));
    console.log(`📋 Total records in CSV: ${results.total}`);
    console.log(`✅ Successfully imported: ${results.imported}`);
    console.log(`📸 With photo URLs: ${results.withPhotos}`);
    console.log(`❌ Import errors: ${results.errors}`);
    console.log(`🏫 Schools not found: ${results.schoolNotFound}`);
    
    if (results.withPhotos > 0) {
      const photoPercentage = ((results.withPhotos / results.imported) * 100).toFixed(1);
      console.log(`📈 Photo coverage: ${photoPercentage}%`);
    }
    
    console.log('\n✅ CSV import completed!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { importStaffFromCSV, parseCSV };