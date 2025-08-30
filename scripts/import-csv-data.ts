#!/usr/bin/env bun

/**
 * CSV Data Import Script
 * 
 * This script imports data from the added_datasets CSV files into the database:
 * 1. NCAA Division schools with athletic websites
 * 2. Athletic program financial/participation metrics  
 * 3. Enhanced location data with coordinates
 * 4. NAIA schools support
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

class CSVImporter {
  private batchId: string;
  
  constructor() {
    this.batchId = `import_${new Date().toISOString().replace(/[:.]/g, '_')}`;
  }

  /**
   * Parse CSV content into objects
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
          row[header] = value === '' || value === 'NA' || value === 'NOT AVAILABLE' ? null : value;
        });
        rows.push(row);
      }
    }
    
    return rows;
  }

  /**
   * Parse a single CSV line handling quoted values
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
   * Import NCAA Division schools from CSV files
   */
  async importNCAASchools(): Promise<ImportResult> {
    const result: ImportResult = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      errorDetails: []
    };

    const divisions = ['d1', 'd2', 'd3'];
    
    for (const division of divisions) {
      const filePath = path.join(process.cwd(), 'datasets', 'added_datasets', 'us_college_sports_data 2', `NCAA_${division}_schools.csv`);
      
      try {
        console.log(`Processing NCAA D${division.toUpperCase()} schools...`);
        const content = readFileSync(filePath, 'utf-8');
        const rows = this.parseCSV(content);
        
        for (const row of rows) {
          result.processed++;
          
          try {
            // Check if school already exists
            const { data: existingSchool } = await supabase
              .from('schools_ncaa_verified')
              .select('id, name')
              .eq('name', row.Name)
              .single();

            const schoolData = {
              name: row.Name as string,
              normalized_name: (row.Name as string).toLowerCase().replace(/[^a-z0-9]/g, '_'),
              ncaa_id: `${row.Name}_${division}`,
              athletic_division: division === 'd1' ? 'NCAA DI' : division === 'd2' ? 'NCAA DII' : 'NCAA DIII',
              conference: row.Conference as string,
              institution_type: (row.Type as string)?.toLowerCase() as 'public' | 'private',
              full_location: row.Location as string,
              state: this.extractState(row.Location as string),
              city: this.extractCity(row.Location as string),
              academic_website: row.URL as string,
              data_sources: ['NCAA_division_csv'],
              verification_status: 'verified',
              data_quality_score: 85
            };

            if (existingSchool) {
              // Update existing school
              const { error } = await supabase
                .from('schools_ncaa_verified')
                .update({
                  ...schoolData,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingSchool.id);

              if (error) throw error;
              result.updated++;
            } else {
              // Insert new school
              const { error } = await supabase
                .from('schools_ncaa_verified')
                .insert(schoolData);

              if (error) throw error;
              result.inserted++;
            }

            // Also insert/update website data
            await this.insertWebsiteData(row.Name as string, row.URL as string, 'academic');

          } catch (error) {
            result.errors++;
            result.errorDetails.push(`Error processing ${row.Name}: ${error}`);
            console.error(`Error processing ${row.Name}:`, error);
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
   * Import NAIA schools
   */
  async importNAIASchools(): Promise<ImportResult> {
    const result: ImportResult = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      errorDetails: []
    };

    const filePath = path.join(process.cwd(), 'datasets', 'added_datasets', 'us_college_sports_data 2', 'NAIA_schools.csv');
    
    try {
      console.log('Processing NAIA schools...');
      const content = readFileSync(filePath, 'utf-8');
      const rows = this.parseCSV(content);
      
      for (const row of rows) {
        result.processed++;
        
        try {
          // Check if school already exists
          const { data: existingSchool } = await supabase
            .from('schools_ncaa_verified')
            .select('id, name')
            .eq('name', row.Name)
            .single();

          const schoolData = {
            name: row.Name as string,
            normalized_name: (row.Name as string).toLowerCase().replace(/[^a-z0-9]/g, '_'),
            ncaa_id: `${row.Name}_naia`,
            athletic_division: 'NAIA' as const,
            conference: row.Conference as string,
            institution_type: (row.Type as string)?.toLowerCase() as 'public' | 'private',
            full_location: row.Location as string,
            state: this.extractState(row.Location as string),
            city: this.extractCity(row.Location as string),
            academic_website: row.URL as string,
            data_sources: ['NAIA_csv'],
            verification_status: 'verified',
            data_quality_score: 85
          };

          if (existingSchool) {
            const { error } = await supabase
              .from('schools_ncaa_verified')
              .update({
                ...schoolData,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingSchool.id);

            if (error) throw error;
            result.updated++;
          } else {
            const { error } = await supabase
              .from('schools_ncaa_verified')
              .insert(schoolData);

            if (error) throw error;
            result.inserted++;
          }

          // Insert website data
          await this.insertWebsiteData(row.Name as string, row.URL as string, 'academic');

        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Error processing ${row.Name}: ${error}`);
        }
      }
      
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
      result.errorDetails.push(`Error reading ${filePath}: ${error}`);
    }

    return result;
  }

  /**
   * Import athletic program metrics from sports.csv
   */
  async importAthleticMetrics(): Promise<ImportResult> {
    const result: ImportResult = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      errorDetails: []
    };

    const filePath = path.join(process.cwd(), 'datasets', 'added_datasets', 'sports.csv');
    
    try {
      console.log('Processing athletic program metrics...');
      const content = readFileSync(filePath, 'utf-8');
      const rows = this.parseCSV(content);
      
      for (const row of rows) {
        result.processed++;
        
        try {
          // Find matching school by name
          const { data: school, error: schoolError } = await supabase
            .from('schools_ncaa_verified')
            .select('id')
            .eq('name', row.institution_name)
            .single();

          if (schoolError || !school) {
            // Try fuzzy matching
            const { data: schools } = await supabase
              .from('schools_ncaa_verified')
              .select('id, name')
              .ilike('name', `%${(row.institution_name as string).split(' ')[0]}%`);

            if (!schools || schools.length === 0) {
              result.errors++;
              result.errorDetails.push(`No matching school found for: ${row.institution_name}`);
              continue;
            }
            
            // Use first match for now
            var schoolId = schools[0].id;
          } else {
            var schoolId = school.id;
          }

          // Insert athletic program metrics
          const metricsData = {
            school_id: schoolId,
            academic_year: parseInt(row.year as string),
            sport: row.sports as string,
            sport_code: parseInt(row.sportscode as string) || null,
            participants_male: parseInt(row.partic_men as string) || 0,
            participants_female: parseInt(row.partic_women as string) || 0,
            participants_coed_male: parseInt(row.partic_coed_men as string) || 0,
            participants_coed_female: parseInt(row.partic_coed_women as string) || 0,
            total_participants_male: parseInt(row.sum_partic_men as string) || 0,
            total_participants_female: parseInt(row.sum_partic_women as string) || 0,
            revenue_male: parseFloat(row.rev_men as string) || 0,
            revenue_female: parseFloat(row.rev_women as string) || 0,
            total_revenue: parseFloat(row.total_rev_menwomen as string) || 0,
            expenses_male: parseFloat(row.exp_men as string) || 0,
            expenses_female: parseFloat(row.exp_women as string) || 0,
            total_expenses: parseFloat(row.total_exp_menwomen as string) || 0,
            data_source: 'IPEDS_athletics_csv',
            confidence_score: 0.95
          };

          const { error } = await supabase
            .from('athletic_program_metrics')
            .upsert(metricsData, {
              onConflict: 'school_id,academic_year,sport'
            });

          if (error) throw error;
          result.inserted++;

        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Error processing metrics for ${row.institution_name}: ${error}`);
        }
      }
      
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
      result.errorDetails.push(`Error reading ${filePath}: ${error}`);
    }

    return result;
  }

  /**
   * Import enhanced location data
   */
  async importLocationData(): Promise<ImportResult> {
    const result: ImportResult = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      errorDetails: []
    };

    const filePath = path.join(process.cwd(), 'datasets', 'added_datasets', 'us-colleges-and-universities 2.csv');
    
    try {
      console.log('Processing enhanced location data...');
      const content = readFileSync(filePath, 'utf-8');
      const rows = this.parseCSV(content, ';');
      
      for (const row of rows) {
        result.processed++;
        
        try {
          // Find matching school
          const { data: school } = await supabase
            .from('schools_ncaa_verified')
            .select('id')
            .eq('name', row.NAME)
            .single();

          if (!school) {
            // Try fuzzy matching
            const { data: schools } = await supabase
              .from('schools_ncaa_verified')
              .select('id, name')
              .ilike('name', `%${(row.NAME as string).split(' ')[0]}%`);

            if (!schools || schools.length === 0) continue;
            var schoolId = schools[0].id;
          } else {
            var schoolId = school.id;
          }

          const locationData = {
            school_id: schoolId,
            latitude: parseFloat(row.LATITUDE as string) || null,
            longitude: parseFloat(row.LONGITUDE as string) || null,
            county: row.COUNTY as string || null,
            county_fips: row.COUNTYFIPS as string || null,
            state_fips: row.STFIPS as string || null,
            zip_code: row.ZIP as string || null,
            zip4: row.ZIP4 as string || null,
            population: parseInt(row.POPULATION as string) || null,
            locale_type: this.classifyLocale(row.LOCALE as string),
            naics_code: row.NAICS_CODE as string || null,
            naics_description: row.NAICS_DESC as string || null,
            data_source: 'NCES_college_navigator',
            source_date: row.SOURCEDATE ? new Date(row.SOURCEDATE as string) : null
          };

          const { error } = await supabase
            .from('school_location_enhanced')
            .upsert(locationData, {
              onConflict: 'school_id'
            });

          if (error) throw error;
          result.inserted++;

        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Error processing location for ${row.NAME}: ${error}`);
        }
      }
      
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
      result.errorDetails.push(`Error reading ${filePath}: ${error}`);
    }

    return result;
  }

  /**
   * Insert website data
   */
  private async insertWebsiteData(schoolName: string, url: string, type: 'academic' | 'athletic') {
    if (!url || url === 'N/A') return;

    const { data: school } = await supabase
      .from('schools_ncaa_verified')
      .select('id')
      .eq('name', schoolName)
      .single();

    if (!school) return;

    const websiteData = {
      school_id: school.id,
      website_url: url,
      website_type: type,
      is_active: true,
      scraping_priority: type === 'athletic' ? 1 : 2,
      scraping_difficulty: 'moderate',
      source: 'csv_import'
    };

    await supabase
      .from('school_websites')
      .upsert(websiteData, {
        onConflict: 'school_id,website_type,website_url'
      });
  }

  /**
   * Extract state from location string
   */
  private extractState(location: string): string {
    if (!location) return '';
    const parts = location.split(',');
    return parts[parts.length - 1]?.trim() || '';
  }

  /**
   * Extract city from location string
   */
  private extractCity(location: string): string {
    if (!location) return '';
    const parts = location.split(',');
    return parts[0]?.trim() || '';
  }

  /**
   * Classify locale type from NCES codes
   */
  private classifyLocale(locale: string): string {
    if (!locale || locale === '-2') return 'unknown';
    
    const code = parseInt(locale);
    if (code >= 11 && code <= 13) return 'city';
    if (code >= 21 && code <= 23) return 'suburb';
    if (code >= 31 && code <= 33) return 'town';
    if (code >= 41 && code <= 43) return 'rural';
    
    return 'unknown';
  }

  /**
   * Run all imports
   */
  async runAllImports(): Promise<void> {
    console.log('🚀 Starting CSV data import process...\n');

    console.log('📊 Importing NCAA Division schools...');
    const ncaaResult = await this.importNCAASchools();
    this.logResult('NCAA Schools', ncaaResult);

    console.log('\n📊 Importing NAIA schools...');
    const naiaResult = await this.importNAIASchools();
    this.logResult('NAIA Schools', naiaResult);

    console.log('\n📊 Importing athletic program metrics...');
    const metricsResult = await this.importAthleticMetrics();
    this.logResult('Athletic Metrics', metricsResult);

    console.log('\n📊 Importing enhanced location data...');
    const locationResult = await this.importLocationData();
    this.logResult('Location Data', locationResult);

    console.log('\n✅ Import process completed!');
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

// Run the import if script is executed directly
if (import.meta.main) {
  const importer = new CSVImporter();
  importer.runAllImports()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { CSVImporter };