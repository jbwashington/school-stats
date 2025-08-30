#!/usr/bin/env bun

/**
 * Enhance Existing Schools Script
 * 
 * This script enhances existing schools with comprehensive data from all CSV files:
 * - Adds contact information, enrollment data, location details
 * - Does not create new schools, only enhances existing ones
 * - Focuses on adding ALL available columns to existing records
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface CSVRow {
  [key: string]: string | number | null;
}

interface ImportResult {
  processed: number;
  enhanced: number;
  errors: number;
  errorDetails: string[];
}

class SchoolEnhancer {
  private parseCSV(content: string, delimiter: string = ','): CSVRow[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(delimiter).map(h => h.replace(/["\uFEFF]/g, '').trim());
    const rows: CSVRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], delimiter);
      if (values.length === headers.length) {
        const row: CSVRow = {};
        headers.forEach((header, index) => {
          const value = values[index];
          row[header] = value === '' || value === 'NA' || value === 'NOT AVAILABLE' || value === '-2' || value === '-999' ? null : value;
        });
        rows.push(row);
      }
    }
    
    return rows;
  }

  private parseCSVLine(line: string, delimiter: string = ','): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Enhance existing schools with comprehensive institutional data
   */
  async enhanceWithInstitutionalData(): Promise<ImportResult> {
    const result: ImportResult = {
      processed: 0,
      enhanced: 0,
      errors: 0,
      errorDetails: []
    };

    const filePath = path.join(process.cwd(), 'datasets', 'added_datasets', 'us-colleges-and-universities 2.csv');
    
    try {
      console.log('Processing comprehensive institutional enhancement...');
      const content = readFileSync(filePath, 'utf-8');
      const rows = this.parseCSV(content, ';');
      
      console.log(`Found ${rows.length} institutions in comprehensive dataset`);
      
      for (const row of rows) {
        result.processed++;
        
        try {
          // Find existing school by name matching
          const { data: schools, error } = await supabase
            .from('schools_ncaa_verified')
            .select('id, name')
            .ilike('name', `%${(row.NAME as string).split(' ')[0]}%`)
            .limit(5);
            
          if (error) throw error;
          
          if (!schools || schools.length === 0) continue;
          
          // Use best match (exact or first fuzzy match)
          const bestMatch = schools.find(s => s.name.toLowerCase() === (row.NAME as string).toLowerCase()) || schools[0];
          
          // Enhance the school record
          const enhancementData = {
            // Contact information
            address: row.ADDRESS as string,
            phone: this.formatPhoneNumber(row.TELEPHONE as string),
            academic_website: row.WEBSITE as string,
            
            // Geographic details
            zip_code: row.ZIP as string,
            country: row.COUNTRY as string || 'USA',
            latitude: parseFloat(row.LATITUDE as string) || null,
            longitude: parseFloat(row.LONGITUDE as string) || null,
            
            // Classification codes
            naics_code: row.NAICS_CODE as string,
            naics_description: row.NAICS_DESC as string,
            state_fips: row.STFIPS as string,
            county_fips: row.COUNTYFIPS as string,
            sector_code: parseInt(row.SECTOR as string) || null,
            level_code: parseInt(row.LEVEL_ as string) || null,
            
            // Institution characteristics
            highest_offering: parseInt(row.HI_OFFER as string) || null,
            degree_granting: parseInt(row.DEG_GRANT as string) || null,
            locale_code: parseInt(row.LOCALE as string) || null,
            size_category: parseInt(row.SIZE_SET as string) || null,
            institution_size: parseInt(row.INST_SIZE as string) || null,
            
            // Enrollment data
            part_time_enrollment: parseInt(row.PT_ENROLL as string) || null,
            full_time_enrollment: parseInt(row.FT_ENROLL as string) || null,
            total_enrollment: parseInt(row.TOT_ENROLL as string) || null,
            
            // Housing and employees
            has_housing: row.HOUSING ? parseInt(row.HOUSING as string) === 1 : null,
            dormitory_capacity: parseInt(row.DORM_CAP as string) || null,
            total_employees: parseInt(row.TOT_EMP as string) || null,
            
            // Data provenance
            data_source: row.SOURCE as string,
            source_date: row.SOURCEDATE ? new Date(row.SOURCEDATE as string) : null,
            validation_method: row.VAL_METHOD as string,
            validation_date: row.VAL_DATE ? new Date(row.VAL_DATE as string) : null,
            
            // Status and history
            status: row.STATUS as string,
            close_date: row.CLOSE_DATE && row.CLOSE_DATE !== '-2' ? new Date(row.CLOSE_DATE as string) : null,
            merge_id: row.MERGE_ID as string,
            alias_names: row.ALIAS && row.ALIAS !== 'NOT AVAILABLE' ? [row.ALIAS as string] : null,
            shelter_id: row.SHELTER_ID as string,
            
            // GIS data
            geo_point_json: row['Geo Point'] ? this.parseGeoPoint(row['Geo Point'] as string) : null,
            geo_shape_json: row['Geo Shape'] ? this.parseGeoShape(row['Geo Shape'] as string) : null,
            
            updated_at: new Date().toISOString()
          };

          await supabase
            .from('schools_ncaa_verified')
            .update(enhancementData)
            .eq('id', bestMatch.id);

          // Also create comprehensive contact info record
          await this.insertContactInformation(bestMatch.id, row);
          
          // And enrollment analytics
          await this.insertEnrollmentAnalytics(bestMatch.id, row);
          
          result.enhanced++;

        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Error enhancing ${row.NAME}: ${error}`);
        }
      }
      
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
      result.errorDetails.push(`Error reading ${filePath}: ${error}`);
    }

    return result;
  }

  /**
   * Insert comprehensive contact information
   */
  private async insertContactInformation(schoolId: number, row: CSVRow) {
    const contactData = {
      school_id: schoolId,
      main_phone: this.formatPhoneNumber(row.TELEPHONE as string),
      street_address: row.ADDRESS as string,
      physical_address: `${row.ADDRESS}, ${row.CITY}, ${row.STATE} ${row.ZIP}`,
      mailing_address: row.ZIP4 ? `${row.ADDRESS}, ${row.CITY}, ${row.STATE} ${row.ZIP}-${row.ZIP4}` : null,
      contact_source: 'NCES_comprehensive_csv',
      contact_verified_date: row.VAL_DATE ? new Date(row.VAL_DATE as string) : null
    };

    await supabase
      .from('school_contact_info')
      .upsert(contactData, {
        onConflict: 'school_id'
      });
  }

  /**
   * Insert enrollment analytics
   */
  private async insertEnrollmentAnalytics(schoolId: number, row: CSVRow) {
    if (!row.TOT_ENROLL || row.TOT_ENROLL === '-999') return;
    
    const enrollmentData = {
      school_id: schoolId,
      academic_year: 2015,
      term: 'Fall',
      
      total_enrollment: parseInt(row.TOT_ENROLL as string) || null,
      part_time_enrollment: parseInt(row.PT_ENROLL as string) || null,
      full_time_enrollment: parseInt(row.FT_ENROLL as string) || null,
      
      enrollment_source: 'NCES_comprehensive',
      data_quality_score: 0.90
    };

    await supabase
      .from('enrollment_analytics')
      .upsert(enrollmentData, {
        onConflict: 'school_id,academic_year,term'
      });
  }

  /**
   * Utility functions
   */
  private formatPhoneNumber(phone: string): string | null {
    if (!phone || phone === 'NOT AVAILABLE') return null;
    return phone.replace(/[^\d\-\(\)\s\+]/g, '').trim();
  }

  private parseGeoPoint(geoPoint: string): any {
    try {
      const coords = geoPoint.split(',');
      return {
        latitude: parseFloat(coords[0]),
        longitude: parseFloat(coords[1])
      };
    } catch {
      return null;
    }
  }

  private parseGeoShape(geoShape: string): any {
    try {
      return JSON.parse(geoShape);
    } catch {
      return null;
    }
  }

  async runEnhancement(): Promise<void> {
    console.log('🔧 Starting school enhancement with comprehensive data...\n');

    console.log('📊 Enhancing schools with comprehensive institutional data...');
    const result = await this.enhanceWithInstitutionalData();
    
    console.log('\n📈 Enhancement Results:');
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Enhanced: ${result.enhanced}`);
    console.log(`  Errors: ${result.errors}`);
    
    if (result.errors > 0 && result.errorDetails.length > 0) {
      console.log('  Error details:');
      result.errorDetails.slice(0, 5).forEach(error => {
        console.log(`    - ${error}`);
      });
      if (result.errorDetails.length > 5) {
        console.log(`    ... and ${result.errorDetails.length - 5} more errors`);
      }
    }

    console.log('\n✅ School enhancement completed!');
    console.log(`🎯 Enhanced ${result.enhanced} existing schools with comprehensive data!`);
  }
}

if (import.meta.main) {
  const enhancer = new SchoolEnhancer();
  enhancer.runEnhancement()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Enhancement failed:', error);
      process.exit(1);
    });
}

export { SchoolEnhancer };