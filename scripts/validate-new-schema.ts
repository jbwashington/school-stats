#!/usr/bin/env bun

/**
 * Schema Validation Script
 * 
 * Validates that the new migration was applied successfully by:
 * 1. Checking that new tables exist
 * 2. Verifying new columns were added
 * 3. Testing new views are working
 * 4. Checking constraints and indexes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ValidationResult {
  passed: boolean;
  message: string;
}

class SchemaValidator {
  
  async validateNewTables(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    const expectedTables = [
      'athletic_program_metrics',
      'school_location_enhanced', 
      'school_websites',
      'csv_import_staging'
    ];

    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (error) {
          results.push({
            passed: false,
            message: `Table ${tableName} does not exist: ${error.message}`
          });
        } else {
          results.push({
            passed: true,
            message: `✓ Table ${tableName} exists and is accessible`
          });
        }
      } catch (error) {
        results.push({
          passed: false,
          message: `Error checking table ${tableName}: ${error}`
        });
      }
    }

    return results;
  }

  async validateNewColumns(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Check if new columns were added to schools_ncaa_verified
    try {
      const { data, error } = await supabase
        .from('schools_ncaa_verified')
        .select('institution_type, enrollment_total, county, zip_code, unitid')
        .limit(1);
        
      if (error) {
        results.push({
          passed: false,
          message: `New columns not added to schools_ncaa_verified: ${error.message}`
        });
      } else {
        results.push({
          passed: true,
          message: '✓ New columns added to schools_ncaa_verified'
        });
      }
    } catch (error) {
      results.push({
        passed: false,
        message: `Error checking new columns: ${error}`
      });
    }

    return results;
  }

  async validateNewViews(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    const expectedViews = [
      'schools_enhanced',
      'athletic_metrics_with_context'
    ];

    for (const viewName of expectedViews) {
      try {
        const { data, error } = await supabase
          .from(viewName)
          .select('*')
          .limit(1);
          
        if (error) {
          results.push({
            passed: false,
            message: `View ${viewName} does not exist: ${error.message}`
          });
        } else {
          results.push({
            passed: true,
            message: `✓ View ${viewName} exists and is accessible`
          });
        }
      } catch (error) {
        results.push({
          passed: false,
          message: `Error checking view ${viewName}: ${error}`
        });
      }
    }

    return results;
  }

  async validateConstraints(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // Test NAIA division constraint
      const { data, error } = await supabase
        .from('schools_ncaa_verified')
        .insert({
          name: 'Test NAIA School',
          normalized_name: 'test_naia_school',
          ncaa_id: 'test_naia',
          athletic_division: 'NAIA',
          conference: 'Test Conference',
          state: 'TX'
        });

      if (error && error.message.includes('athletic_division')) {
        results.push({
          passed: false,
          message: `NAIA constraint not working: ${error.message}`
        });
      } else {
        // Clean up test data
        if (data) {
          await supabase
            .from('schools_ncaa_verified')
            .delete()
            .eq('name', 'Test NAIA School');
        }
        
        results.push({
          passed: true,
          message: '✓ NAIA division constraint is working'
        });
      }
    } catch (error) {
      results.push({
        passed: false,
        message: `Error testing constraints: ${error}`
      });
    }

    return results;
  }

  async runAllValidations(): Promise<void> {
    console.log('🔍 Validating new database schema...\n');

    console.log('📊 Checking new tables...');
    const tableResults = await this.validateNewTables();
    this.logResults(tableResults);

    console.log('\n📊 Checking new columns...');
    const columnResults = await this.validateNewColumns();
    this.logResults(columnResults);

    console.log('\n📊 Checking new views...');
    const viewResults = await this.validateNewViews();
    this.logResults(viewResults);

    console.log('\n📊 Checking constraints...');
    const constraintResults = await this.validateConstraints();
    this.logResults(constraintResults);

    const allResults = [...tableResults, ...columnResults, ...viewResults, ...constraintResults];
    const passed = allResults.filter(r => r.passed).length;
    const total = allResults.length;
    const failed = total - passed;

    console.log('\n' + '='.repeat(50));
    console.log(`📋 Validation Summary:`);
    console.log(`   ✅ Passed: ${passed}/${total}`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed}/${total}`);
      console.log('\nFailed validations need to be addressed before importing data.');
    } else {
      console.log('   🎉 All validations passed! Schema is ready for data import.');
    }
  }

  private logResults(results: ValidationResult[]): void {
    results.forEach(result => {
      if (result.passed) {
        console.log(`   ${result.message}`);
      } else {
        console.log(`   ❌ ${result.message}`);
      }
    });
  }
}

// Run validation if script is executed directly
if (import.meta.main) {
  const validator = new SchemaValidator();
  validator.runAllValidations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

export { SchemaValidator };