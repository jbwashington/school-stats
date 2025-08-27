#!/usr/bin/env bun

/**
 * Dataset Validation Script
 * Validates the integrity and quality of all CSV datasets
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface DatasetValidation {
  filename: string;
  path: string;
  size: number;
  records: number;
  columns: string[];
  quality: {
    completeness: number;
    validity: number;
    consistency: number;
    accuracy: number;
  };
  issues: string[];
  recommendations: string[];
}

class DatasetValidator {
  private datasetsPath = 'datasets/raw';
  
  /**
   * Validate all datasets
   */
  async validateAllDatasets(): Promise<void> {
    console.log('🔍 Starting dataset validation...\n');
    
    const files = fs.readdirSync(this.datasetsPath)
      .filter(file => file.endsWith('.csv'))
      .sort();
    
    const validations: DatasetValidation[] = [];
    
    for (const file of files) {
      const filePath = path.join(this.datasetsPath, file);
      console.log(`📄 Validating: ${file}`);
      
      try {
        const validation = await this.validateDataset(filePath);
        validations.push(validation);
        this.printValidationSummary(validation);
      } catch (error) {
        console.error(`   ❌ Error validating ${file}:`, error);
      }
      
      console.log('');
    }
    
    // Generate comprehensive report
    this.generateValidationReport(validations);
  }
  
  /**
   * Validate individual dataset
   */
  private async validateDataset(filePath: string): Promise<DatasetValidation> {
    const filename = path.basename(filePath);
    const stats = fs.statSync(filePath);
    
    // Read CSV content
    const content = fs.readFileSync(filePath, 'utf-8');
    
    let records: any[] = [];
    let columns: string[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Parse CSV
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      if (records.length > 0) {
        columns = Object.keys(records[0]);
      }
      
    } catch (error) {
      issues.push(`CSV parsing failed: ${error}`);
      return {
        filename,
        path: filePath,
        size: stats.size,
        records: 0,
        columns: [],
        quality: { completeness: 0, validity: 0, consistency: 0, accuracy: 0 },
        issues,
        recommendations: ['Fix CSV format issues before processing']
      };
    }
    
    // Perform quality checks
    const quality = this.assessDataQuality(records, columns, filename, issues, recommendations);
    
    return {
      filename,
      path: filePath,
      size: stats.size,
      records: records.length,
      columns,
      quality,
      issues,
      recommendations
    };
  }
  
  /**
   * Assess data quality across multiple dimensions
   */
  private assessDataQuality(
    records: any[],
    columns: string[],
    filename: string,
    issues: string[],
    recommendations: string[]
  ): DatasetValidation['quality'] {
    
    if (records.length === 0) {
      issues.push('Dataset is empty');
      return { completeness: 0, validity: 0, consistency: 0, accuracy: 0 };
    }
    
    // 1. Completeness Assessment
    const completeness = this.assessCompleteness(records, columns, issues, recommendations);
    
    // 2. Validity Assessment  
    const validity = this.assessValidity(records, columns, filename, issues, recommendations);
    
    // 3. Consistency Assessment
    const consistency = this.assessConsistency(records, columns, issues, recommendations);
    
    // 4. Accuracy Assessment (context-specific)
    const accuracy = this.assessAccuracy(records, columns, filename, issues, recommendations);
    
    return { completeness, validity, consistency, accuracy };
  }
  
  /**
   * Assess data completeness
   */
  private assessCompleteness(
    records: any[],
    columns: string[],
    issues: string[],
    recommendations: string[]
  ): number {
    
    let totalFields = 0;
    let filledFields = 0;
    
    for (const record of records) {
      for (const column of columns) {
        totalFields++;
        const value = record[column];
        if (value && value.toString().trim().length > 0) {
          filledFields++;
        }
      }
    }
    
    const completeness = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
    
    if (completeness < 50) {
      issues.push(`Low data completeness: ${completeness.toFixed(1)}%`);
      recommendations.push('Review data source for missing information');
    } else if (completeness < 80) {
      recommendations.push('Consider data enrichment for missing fields');
    }
    
    return completeness;
  }
  
  /**
   * Assess data validity
   */
  private assessValidity(
    records: any[],
    columns: string[],
    filename: string,
    issues: string[],
    recommendations: string[]
  ): number {
    
    let validRecords = 0;
    const validationRules = this.getValidationRules(filename);
    
    for (const record of records) {
      let recordValid = true;
      
      for (const [field, rule] of Object.entries(validationRules)) {
        const value = record[field];
        
        if (rule.required && (!value || value.toString().trim().length === 0)) {
          recordValid = false;
          break;
        }
        
        if (value && rule.pattern && !rule.pattern.test(value.toString())) {
          recordValid = false;
          break;
        }
        
        if (value && rule.minLength && value.toString().length < rule.minLength) {
          recordValid = false;
          break;
        }
        
        if (value && rule.maxLength && value.toString().length > rule.maxLength) {
          recordValid = false;
          break;
        }
      }
      
      if (recordValid) validRecords++;
    }
    
    const validity = records.length > 0 ? (validRecords / records.length) * 100 : 0;
    
    if (validity < 70) {
      issues.push(`Low data validity: ${validity.toFixed(1)}%`);
      recommendations.push('Review data format standards and validation rules');
    }
    
    return validity;
  }
  
  /**
   * Assess data consistency
   */
  private assessConsistency(
    records: any[],
    columns: string[],
    issues: string[],
    recommendations: string[]
  ): number {
    
    let consistencyScore = 100;
    
    // Check for format consistency in key fields
    const formatChecks: Record<string, { pattern: RegExp; description: string }> = {
      'state': { pattern: /^[A-Z]{2}$/, description: 'Two-letter state codes' },
      'athletic_website': { pattern: /^https?:\/\//, description: 'Valid URLs' },
      'Athletic Website': { pattern: /^https?:\/\//, description: 'Valid URLs' },
      'website': { pattern: /^https?:\/\//, description: 'Valid URLs' }
    };
    
    for (const [field, check] of Object.entries(formatChecks)) {
      if (columns.includes(field)) {
        const fieldValues = records
          .map(r => r[field])
          .filter(v => v && v.toString().trim().length > 0);
        
        if (fieldValues.length > 0) {
          const validCount = fieldValues.filter(v => check.pattern.test(v.toString())).length;
          const consistency = (validCount / fieldValues.length) * 100;
          
          if (consistency < 80) {
            issues.push(`${field} format inconsistency: ${consistency.toFixed(1)}% valid`);
            recommendations.push(`Standardize ${field} format: ${check.description}`);
            consistencyScore -= 10;
          }
        }
      }
    }
    
    // Check for duplicate records
    const nameField = this.getNameField(columns);
    if (nameField) {
      const names = records.map(r => r[nameField]).filter(n => n);
      const uniqueNames = new Set(names);
      
      if (names.length !== uniqueNames.size) {
        const duplicates = names.length - uniqueNames.size;
        issues.push(`${duplicates} potential duplicate records detected`);
        recommendations.push('Review and remove duplicate entries');
        consistencyScore -= Math.min(20, duplicates * 2);
      }
    }
    
    return Math.max(0, consistencyScore);
  }
  
  /**
   * Assess data accuracy (context-specific)
   */
  private assessAccuracy(
    records: any[],
    columns: string[],
    filename: string,
    issues: string[],
    recommendations: string[]
  ): number {
    
    let accuracyScore = 100;
    
    // NCAA-specific accuracy checks
    if (filename.toLowerCase().includes('ncaa')) {
      // Check for valid conference names
      const conferenceField = columns.find(c => 
        c.toLowerCase().includes('conference') && !c.toLowerCase().includes('name')
      );
      
      if (conferenceField) {
        const conferences = records
          .map(r => r[conferenceField])
          .filter(c => c && c.toString().trim().length > 0);
        
        const knownConferences = [
          'SEC', 'Big Ten', 'Pac-12', 'Big 12', 'ACC', 'Big East', 'American',
          'Mountain West', 'C-USA', 'MAC', 'Sun Belt', 'WAC', 'Ivy League'
        ];
        
        const unknownConferences = conferences.filter(c => 
          !knownConferences.some(known => 
            c.toString().toLowerCase().includes(known.toLowerCase())
          )
        );
        
        if (unknownConferences.length > conferences.length * 0.3) {
          issues.push('Many unrecognized conference names detected');
          recommendations.push('Verify conference name standardization');
          accuracyScore -= 15;
        }
      }
      
      // Check for valid state codes
      const stateField = columns.find(c => c.toLowerCase().includes('state'));
      if (stateField) {
        const states = records
          .map(r => r[stateField])
          .filter(s => s && s.toString().trim().length > 0);
        
        const invalidStates = states.filter(s => {
          const state = s.toString().trim();
          return state.length !== 2 || !/^[A-Z]{2}$/.test(state);
        });
        
        if (invalidStates.length > states.length * 0.1) {
          issues.push('Invalid state codes detected');
          recommendations.push('Standardize state codes to 2-letter format');
          accuracyScore -= 10;
        }
      }
    }
    
    // Sports data accuracy checks
    if (filename.toLowerCase().includes('sport')) {
      const nameField = this.getNameField(columns);
      if (nameField) {
        const sportNames = records.map(r => r[nameField]).filter(n => n);
        
        // Check for common sport name variations that should be standardized
        const variations = [
          { variations: ['mens basketball', "men's basketball", 'basketball men'], standard: "Men's Basketball" },
          { variations: ['womens basketball', "women's basketball", 'basketball women'], standard: "Women's Basketball" },
          { variations: ['football', 'american football'], standard: 'Football' }
        ];
        
        let needsStandardization = 0;
        for (const group of variations) {
          const found = sportNames.filter(name => 
            group.variations.some(variant => 
              name.toString().toLowerCase().includes(variant.toLowerCase())
            )
          );
          
          if (found.length > 1) needsStandardization += found.length;
        }
        
        if (needsStandardization > 0) {
          recommendations.push('Standardize sport name formats for consistency');
          accuracyScore -= Math.min(15, needsStandardization);
        }
      }
    }
    
    return Math.max(0, accuracyScore);
  }
  
  /**
   * Get validation rules for specific dataset types
   */
  private getValidationRules(filename: string): Record<string, any> {
    const rules: Record<string, any> = {};
    
    if (filename.toLowerCase().includes('ncaa')) {
      // NCAA school data validation rules
      const nameField = ['name', 'School Name', 'institution'].find(f => true);
      if (nameField) {
        rules[nameField] = { required: true, minLength: 3, maxLength: 100 };
      }
      
      rules['state'] = { pattern: /^[A-Z]{2}$/ };
      rules['athletic_website'] = { pattern: /^https?:\/\/.+/ };
      rules['Athletic Website'] = { pattern: /^https?:\/\/.+/ };
      rules['website'] = { pattern: /^https?:\/\/.+/ };
    }
    
    if (filename.toLowerCase().includes('sport')) {
      // Sports data validation rules
      const nameField = this.getNameField(['name', 'sport', 'sport_name']);
      if (nameField) {
        rules[nameField] = { required: true, minLength: 2, maxLength: 50 };
      }
    }
    
    return rules;
  }
  
  /**
   * Find the most likely name field in columns
   */
  private getNameField(columns: string[]): string | undefined {
    const nameFields = ['name', 'Name', 'School Name', 'school_name', 'institution', 'sport', 'sport_name'];
    return nameFields.find(field => columns.includes(field));
  }
  
  /**
   * Print validation summary for a dataset
   */
  private printValidationSummary(validation: DatasetValidation): void {
    const { filename, records, quality, issues, recommendations } = validation;
    
    console.log(`   📊 Records: ${records.toLocaleString()}`);
    console.log(`   🏆 Quality Scores:`);
    console.log(`     Completeness: ${quality.completeness.toFixed(1)}%`);
    console.log(`     Validity: ${quality.validity.toFixed(1)}%`);
    console.log(`     Consistency: ${quality.consistency.toFixed(1)}%`);
    console.log(`     Accuracy: ${quality.accuracy.toFixed(1)}%`);
    
    const overallScore = (quality.completeness + quality.validity + quality.consistency + quality.accuracy) / 4;
    console.log(`     Overall: ${overallScore.toFixed(1)}%`);
    
    if (issues.length > 0) {
      console.log(`   ⚠️  Issues:`);
      issues.forEach(issue => console.log(`     - ${issue}`));
    }
    
    if (recommendations.length > 0) {
      console.log(`   💡 Recommendations:`);
      recommendations.slice(0, 3).forEach(rec => console.log(`     - ${rec}`));
    }
  }
  
  /**
   * Generate comprehensive validation report
   */
  private generateValidationReport(validations: DatasetValidation[]): void {
    console.log('\n📋 Generating validation report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_datasets: validations.length,
        total_records: validations.reduce((sum, v) => sum + v.records, 0),
        total_size_mb: validations.reduce((sum, v) => sum + v.size, 0) / (1024 * 1024),
        avg_quality: {
          completeness: validations.reduce((sum, v) => sum + v.quality.completeness, 0) / validations.length,
          validity: validations.reduce((sum, v) => sum + v.quality.validity, 0) / validations.length,
          consistency: validations.reduce((sum, v) => sum + v.quality.consistency, 0) / validations.length,
          accuracy: validations.reduce((sum, v) => sum + v.quality.accuracy, 0) / validations.length
        }
      },
      datasets: validations,
      recommendations: this.generateGlobalRecommendations(validations)
    };
    
    // Save detailed report
    const reportPath = `datasets/processed/validation-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`   📊 Validation report saved: ${reportPath}`);
    console.log(`   📈 Summary:`);
    console.log(`     Total datasets: ${report.summary.total_datasets}`);
    console.log(`     Total records: ${report.summary.total_records.toLocaleString()}`);
    console.log(`     Total size: ${report.summary.total_size_mb.toFixed(2)} MB`);
    console.log(`     Average quality: ${((
      report.summary.avg_quality.completeness +
      report.summary.avg_quality.validity +
      report.summary.avg_quality.consistency +
      report.summary.avg_quality.accuracy
    ) / 4).toFixed(1)}%`);
  }
  
  /**
   * Generate global recommendations across all datasets
   */
  private generateGlobalRecommendations(validations: DatasetValidation[]): string[] {
    const recommendations = new Set<string>();
    
    // Collect common issues
    const allIssues = validations.flatMap(v => v.issues);
    const allRecs = validations.flatMap(v => v.recommendations);
    
    // Add high-priority global recommendations
    if (validations.some(v => v.quality.completeness < 70)) {
      recommendations.add('Establish data collection standards to improve completeness');
    }
    
    if (validations.some(v => v.quality.validity < 70)) {
      recommendations.add('Implement automated data validation in collection pipeline');
    }
    
    if (allIssues.some(issue => issue.includes('duplicate'))) {
      recommendations.add('Implement deduplication process for all datasets');
    }
    
    if (allIssues.some(issue => issue.includes('format') || issue.includes('consistency'))) {
      recommendations.add('Create data format standards and validation schemas');
    }
    
    recommendations.add('Schedule regular dataset validation and quality monitoring');
    recommendations.add('Consider data enrichment for missing critical fields');
    
    return Array.from(recommendations);
  }
}

// Run if executed directly
if (import.meta.main) {
  const validator = new DatasetValidator();
  
  (async () => {
    try {
      await validator.validateAllDatasets();
      
      console.log('\n🎉 Dataset validation completed successfully!');
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  })();
}