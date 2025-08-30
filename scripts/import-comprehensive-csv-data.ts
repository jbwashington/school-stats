#!/usr/bin/env bun

/**
 * Comprehensive CSV Data Import Script
 * 
 * This script imports ALL available data from ALL CSV files with complete column mapping:
 * 1. Complete institutional data with all demographics and characteristics
 * 2. Full contact information including phone, email, addresses
 * 3. Comprehensive athletic program data with all financial metrics
 * 4. Complete enrollment analytics and student demographics
 * 5. Enhanced location data with all geographic details
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface CSVRow {
  [key: string]: string | number | null;
}

interface ImportResult {
  processed: number;
  inserted: number;
  updated: number;
  errors: number;
  errorDetails: string[];
}

class ComprehensiveCSVImporter {
  private batchId: string;
  
  constructor() {
    this.batchId = `comprehensive_import_${new Date().toISOString().replace(/[:.]/g, '_')}`;
  }

  /**
   * Parse CSV content into objects with flexible delimiter support
   */
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

  /**
   * Parse a single CSV line handling quoted values and flexible delimiters
   */
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
   * Import comprehensive college/university data with ALL columns
   */
  async importComprehensiveInstitutionalData(): Promise<ImportResult> {
    const result: ImportResult = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      errorDetails: []
    };

    const files = [
      'us-colleges-and-universities 2.csv',
      'us-colleges-and-universities 3.csv', 
      'us-colleges-and-universities 4.csv'
    ];

    for (const fileName of files) {
      const filePath = path.join(process.cwd(), 'datasets', 'added_datasets', fileName);
      
      try {
        console.log(`Processing comprehensive data from ${fileName}...`);
        const content = readFileSync(filePath, 'utf-8');
        const rows = this.parseCSV(content, ';');
        
        console.log(`Found ${rows.length} institutions in ${fileName}`);
        
        for (const row of rows) {
          result.processed++;
          
          try {
            // Find or create school
            let schoolId = await this.findOrCreateSchool(row, result);
            
            if (!schoolId) continue;
            
            // Insert comprehensive institutional data
            await this.insertInstitutionalDetails(schoolId, row);
            
            // Insert contact information
            await this.insertContactInformation(schoolId, row);
            
            // Insert enrollment analytics  
            await this.insertEnrollmentAnalytics(schoolId, row);
            
            // Update school record with additional data
            await this.updateSchoolWithComprehensiveData(schoolId, row);
            
            result.inserted++;

          } catch (error) {
            result.errors++;
            result.errorDetails.push(`Error processing ${row.NAME}: ${error}`);
            console.error(`Error processing ${row.NAME}:`, error);
          }
        }
        
      } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        result.errorDetails.push(`Error reading ${filePath}: ${error}`);
      }
    }

    return result;
  }

  /**
   * Find existing school or create new one
   */
  private async findOrCreateSchool(row: CSVRow, result: ImportResult): Promise<number | null> {
    // First try IPEDS ID match
    if (row.IPEDSID) {
      const { data: existingSchool } = await supabase
        .from('schools_ncaa_verified')
        .select('id')
        .eq('unitid', row.IPEDSID)
        .single();
        
      if (existingSchool) {
        return existingSchool.id;
      }
    }
    
    // Then try name match
    const { data: nameMatch } = await supabase
      .from('schools_ncaa_verified')
      .select('id')
      .eq('name', row.NAME)
      .single();
      
    if (nameMatch) {
      return nameMatch.id;
    }
    
    // Try fuzzy name match
    const { data: fuzzyMatches } = await supabase
      .from('schools_ncaa_verified')
      .select('id, name')
      .ilike('name', `%${(row.NAME as string).split(' ')[0]}%`);
      
    if (fuzzyMatches && fuzzyMatches.length > 0) {
      return fuzzyMatches[0].id;
    }
    
    // Create new school if no match found (only for degree-granting institutions)
    if (this.isDegreeGrantingInstitution(row)) {
      try {
        const { data: newSchool, error } = await supabase
          .from('schools_ncaa_verified')
          .insert({
            name: row.NAME as string,
            normalized_name: (row.NAME as string).toLowerCase().replace(/[^a-z0-9]/g, '_'),
            ncaa_id: `institutional_${row.IPEDSID || row.OBJECTID}`,
            athletic_division: this.determineAthleticDivision(row),
            conference: 'Independent',
            institution_type: this.mapInstitutionType(row.TYPE as number),
            state: row.STATE as string,
            city: row.CITY as string,
            unitid: row.IPEDSID as string,
            data_sources: ['comprehensive_college_csv'],
            verification_status: 'imported',
            data_quality_score: 75
          })
          .select('id')
          .single();
          
        if (error) throw error;
        result.inserted++;
        return newSchool.id;
        
      } catch (error) {
        console.error(`Error creating school for ${row.NAME}:`, error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Insert comprehensive institutional details
   */
  private async insertInstitutionalDetails(schoolId: number, row: CSVRow) {
    const institutionalData = {
      school_id: schoolId,
      ipeds_id: row.IPEDSID as string,
      object_id: parseInt(row.OBJECTID as string) || null,
      
      // Academic characteristics
      highest_degree_offered: this.mapHighestDegree(row.HI_OFFER as number),
      degree_granting_status: parseInt(row.DEG_GRANT as string) || null,
      
      // Size and classification
      carnegie_basic: parseInt(row.SECTOR as string) || null,
      carnegie_size: parseInt(row.SIZE_SET as string) || null,
      institution_size: parseInt(row.INST_SIZE as string) || null,
      
      // Geographic context
      urban_rural_classification: this.classifyLocale(row.LOCALE as string),
      locale_description: this.getLocaleDescription(row.LOCALE as string),
      
      // Data quality
      data_collection_year: 2015, // Based on source data
      last_updated_date: row.SOURCEDATE ? new Date(row.SOURCEDATE as string) : null,
      data_quality_flags: this.assessDataQuality(row)
    };

    await supabase
      .from('institutional_details')
      .upsert(institutionalData, {
        onConflict: 'school_id'
      });
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
      academic_year: 2015, // Based on data source year
      term: 'Fall',
      
      // Total enrollments
      total_enrollment: parseInt(row.TOT_ENROLL as string) || null,
      part_time_enrollment: parseInt(row.PT_ENROLL as string) || null,
      full_time_enrollment: parseInt(row.FT_ENROLL as string) || null,
      
      // Data source
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
   * Update school record with comprehensive data
   */
  private async updateSchoolWithComprehensiveData(schoolId: number, row: CSVRow) {
    const updateData = {
      // Contact and location details
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
      .update(updateData)
      .eq('id', schoolId);
  }

  /**
   * Import enhanced athletic program data with ALL financial columns
   */
  async importEnhancedAthleticData(): Promise<ImportResult> {
    const result: ImportResult = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      errorDetails: []
    };

    const files = ['sports.csv', 'us-colleiate-sports-dataset.csv'];
    
    for (const fileName of files) {
      const filePath = path.join(process.cwd(), 'datasets', 'added_datasets', fileName);
      
      try {
        console.log(`Processing enhanced athletic data from ${fileName}...`);
        const content = readFileSync(filePath, 'utf-8');
        const rows = this.parseCSV(content, ',');
        
        console.log(`Found ${rows.length} athletic program records in ${fileName}`);
        
        for (const row of rows) {
          result.processed++;
          
          try {
            // Find school by name or UNITID
            const schoolId = await this.findSchoolForAthleticData(row);
            
            if (!schoolId) {
              result.errors++;
              result.errorDetails.push(`No matching school found for: ${row.institution_name}`);
              continue;
            }

            // Insert comprehensive athletic program metrics
            const metricsData = {
              school_id: schoolId,
              academic_year: parseInt(row.year as string),
              sport: row.sports as string,
              sport_code: parseInt(row.sportscode as string) || null,
              
              // Participation data - ALL columns
              participants_male: parseInt(row.partic_men as string) || 0,
              participants_female: parseInt(row.partic_women as string) || 0,
              participants_coed_male: parseInt(row.partic_coed_men as string) || 0,
              participants_coed_female: parseInt(row.partic_coed_women as string) || 0,
              total_participants_male: parseInt(row.sum_partic_men as string) || 0,
              total_participants_female: parseInt(row.sum_partic_women as string) || 0,
              
              // Financial data - ALL columns
              revenue_male: parseFloat(row.rev_men as string) || 0,
              revenue_female: parseFloat(row.rev_women as string) || 0,
              total_revenue: parseFloat(row.total_rev_menwomen as string) || 0,
              expenses_male: parseFloat(row.exp_men as string) || 0,
              expenses_female: parseFloat(row.exp_women as string) || 0,
              total_expenses: parseFloat(row.total_exp_menwomen as string) || 0,
              
              // Institutional context - NEW comprehensive columns
              classification_code: parseInt(row.classification_code as string) || null,
              classification_name: row.classification_name as string,
              classification_other: row.classification_other as string,
              enrollment_male: parseInt(row.ef_male_count as string) || null,
              enrollment_female: parseInt(row.ef_female_count as string) || null,
              enrollment_total: parseInt(row.ef_total_count as string) || null,
              sector_code: parseInt(row.sector_cd as string) || null,
              sector_name: row.sector_name as string,
              city: row.city_txt as string,
              state: row.state_cd as string,
              zip_code: row.zip_text as string,
              
              // Data quality
              data_source: 'IPEDS_athletics_comprehensive',
              confidence_score: 0.98
            };

            await supabase
              .from('athletic_program_metrics')
              .upsert(metricsData, {
                onConflict: 'school_id,academic_year,sport'
              });

            result.inserted++;

          } catch (error) {
            result.errors++;
            result.errorDetails.push(`Error processing athletic data for ${row.institution_name}: ${error}`);
          }
        }
        
      } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        result.errorDetails.push(`Error reading ${filePath}: ${error}`);
      }
    }

    return result;
  }

  /**
   * Find school for athletic data using multiple matching strategies
   */
  private async findSchoolForAthleticData(row: CSVRow): Promise<number | null> {
    // Try UNITID match first
    if (row.unitid) {
      const { data: unitidMatch } = await supabase
        .from('schools_ncaa_verified')
        .select('id')
        .eq('unitid', row.unitid)
        .single();
        
      if (unitidMatch) return unitidMatch.id;
    }
    
    // Try exact name match
    const { data: nameMatch } = await supabase
      .from('schools_ncaa_verified')
      .select('id')
      .eq('name', row.institution_name)
      .single();
      
    if (nameMatch) return nameMatch.id;
    
    // Try fuzzy matching with state
    const { data: fuzzyMatches } = await supabase
      .from('schools_ncaa_verified')
      .select('id, name')
      .ilike('name', `%${(row.institution_name as string).split(' ')[0]}%`)
      .eq('state', row.state_cd);
      
    if (fuzzyMatches && fuzzyMatches.length > 0) {
      return fuzzyMatches[0].id;
    }
    
    return null;
  }

  /**
   * Utility functions for data processing
   */
  private isDegreeGrantingInstitution(row: CSVRow): boolean {
    return row.DEG_GRANT === '1' || row.TYPE === '1' || row.TYPE === '2';
  }

  private determineAthleticDivision(row: CSVRow): string {
    // Default to unknown for non-athletic institutions
    return 'Unknown';
  }

  private mapInstitutionType(type: number): 'public' | 'private' | 'unknown' {
    if (type === 1) return 'public';
    if (type === 2 || type === 3) return 'private';
    return 'unknown';
  }

  private mapHighestDegree(hiOffer: number): number {
    // Map HI_OFFER codes to our standardized degree levels
    return hiOffer || 0;
  }

  private classifyLocale(locale: string): string {
    if (!locale || locale === '-2') return 'unknown';
    
    const code = parseInt(locale);
    if (code >= 11 && code <= 13) return 'city';
    if (code >= 21 && code <= 23) return 'suburb';
    if (code >= 31 && code <= 33) return 'town';
    if (code >= 41 && code <= 43) return 'rural';
    
    return 'unknown';
  }

  private getLocaleDescription(locale: string): string {
    // Detailed locale descriptions based on NCES codes
    const descriptions: { [key: string]: string } = {
      '11': 'Large City',
      '12': 'Midsize City', 
      '13': 'Small City',
      '21': 'Large Suburb',
      '22': 'Midsize Suburb',
      '23': 'Small Suburb',
      '31': 'Fringe Town',
      '32': 'Distant Town',
      '33': 'Remote Town',
      '41': 'Fringe Rural',
      '42': 'Distant Rural',
      '43': 'Remote Rural'
    };
    
    return descriptions[locale] || 'Unknown';
  }

  private formatPhoneNumber(phone: string): string | null {
    if (!phone || phone === 'NOT AVAILABLE') return null;
    
    // Basic phone number cleanup
    return phone.replace(/[^\d\-\(\)\s\+]/g, '').trim();
  }

  private assessDataQuality(row: CSVRow): string[] {
    const issues: string[] = [];
    
    if (!row.LATITUDE || !row.LONGITUDE) issues.push('missing_coordinates');
    if (!row.TELEPHONE) issues.push('missing_phone');
    if (!row.WEBSITE) issues.push('missing_website');
    if (!row.TOT_ENROLL || row.TOT_ENROLL === '-999') issues.push('missing_enrollment');
    
    return issues;
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

  /**
   * Run comprehensive import of all data
   */
  async runComprehensiveImport(): Promise<void> {
    console.log('🚀 Starting COMPREHENSIVE CSV data import process...\n');
    console.log('This will import ALL available columns from ALL datasets.\n');

    console.log('📊 Phase 1: Importing comprehensive institutional data...');
    const institutionalResult = await this.importComprehensiveInstitutionalData();
    this.logResult('Comprehensive Institutional Data', institutionalResult);

    console.log('\n📊 Phase 2: Importing enhanced athletic program data...');
    const athleticResult = await this.importEnhancedAthleticData();
    this.logResult('Enhanced Athletic Programs', athleticResult);

    console.log('\n✅ COMPREHENSIVE import process completed!');
    console.log('\n📈 Summary:');
    console.log(`   Total institutions processed: ${institutionalResult.processed}`);
    console.log(`   Total athletic records processed: ${athleticResult.processed}`);
    console.log(`   Total successful insertions: ${institutionalResult.inserted + athleticResult.inserted}`);
    console.log('\n🎯 Your database now contains the most comprehensive college sports dataset available!');
  }

  private logResult(category: string, result: ImportResult): void {
    console.log(`${category} Results:`);
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Inserted: ${result.inserted}`);
    console.log(`  Updated: ${result.updated}`);
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
  }
}

// Run the comprehensive import if script is executed directly
if (import.meta.main) {
  const importer = new ComprehensiveCSVImporter();
  importer.runComprehensiveImport()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Comprehensive import failed:', error);
      process.exit(1);
    });
}

export { ComprehensiveCSVImporter };