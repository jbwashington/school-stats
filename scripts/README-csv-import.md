# CSV Data Import Guide

This guide explains how to import the comprehensive college sports data from the `datasets/added_datasets/` folder into your School Stats database.

## 🎯 What Data Gets Imported

### 1. **NCAA Division Schools** (D1, D2, D3)
- **Source**: `us_college_sports_data 2/NCAA_d*_schools.csv`
- **Data**: 1000+ schools with names, conferences, divisions, and academic websites
- **Target**: `schools_ncaa_verified` table + `school_websites` table

### 2. **NAIA Schools**  
- **Source**: `us_college_sports_data 2/NAIA_schools.csv`
- **Data**: NAIA schools (expands beyond NCAA)
- **Target**: `schools_ncaa_verified` table (with athletic_division = 'NAIA')

### 3. **Athletic Program Financial Data**
- **Source**: `sports.csv`
- **Data**: Revenue, expenses, participation by sport/gender for 2015+
- **Target**: `athletic_program_metrics` table

### 4. **Enhanced Location Data**
- **Source**: `us-colleges-and-universities 2.csv`  
- **Data**: Precise coordinates, county info, demographics
- **Target**: `school_location_enhanced` table

## 🚀 Quick Start

### Step 1: Apply Database Migration

```bash
# Run the database migration to create new tables/columns
bun db:migrate
```

### Step 2: Validate Schema

```bash  
# Verify all new tables and views were created properly
bun validate:schema
```

### Step 3: Import CSV Data

```bash
# Import all CSV datasets (takes 5-10 minutes)
bun import:csv-data
```

## 📊 Expected Results

After import completion, you should see:

```
📋 NCAA Schools Results:
  Processed: ~1,200 schools
  Inserted: ~800 new schools  
  Updated: ~400 existing schools
  Errors: <5%

📋 Athletic Metrics Results:  
  Processed: ~50,000 sport/year records
  Inserted: ~45,000 new metrics
  Errors: ~5% (mostly unmatched schools)

📋 Location Data Results:
  Processed: ~7,000 institutions
  Inserted: ~1,500 matched schools
  Updated: ~300 existing locations
```

## 🏗️ New Database Structure

### Enhanced Schools Table

The `schools_ncaa_verified` table now includes:

```sql
-- New columns for comprehensive data
institution_type        -- public/private
enrollment_total        -- student counts  
county, zip_code        -- location details
unitid                  -- federal education ID
athletic_division       -- now supports 'NAIA'
```

### New Tables Created

1. **`athletic_program_metrics`** - Financial/participation data by sport
2. **`school_location_enhanced`** - Precise coordinates and demographics  
3. **`school_websites`** - Website tracking for scraping optimization
4. **`csv_import_staging`** - Import processing with error handling

### Enhanced Views

- **`schools_enhanced`** - Complete school info with location, websites, athletic data
- **`athletic_metrics_with_context`** - Financial metrics with school context

## 🔧 Advanced Usage

### Import Specific Datasets

```bash
# Just NCAA schools (without metrics/location)
bun -e "
import { CSVImporter } from './scripts/import-csv-data.ts';
const importer = new CSVImporter();
await importer.importNCAASchools();
"

# Just athletic program metrics
bun -e "
import { CSVImporter } from './scripts/import-csv-data.ts';
const importer = new CSVImporter();  
await importer.importAthleticMetrics();
"
```

### Query Enhanced Data

```sql
-- Schools with complete athletic program data
SELECT s.name, s.athletic_division, s.conference,
       le.latitude, le.longitude, le.county,
       w.website_url as athletic_website
FROM schools_enhanced s 
WHERE s.total_sports > 10 
  AND s.precise_latitude IS NOT NULL;

-- Top revenue-generating programs
SELECT school_name, sport, total_revenue, total_expenses,
       (total_revenue - total_expenses) as net_result
FROM athletic_metrics_with_context
WHERE academic_year = 2015 
ORDER BY total_revenue DESC LIMIT 20;
```

## ⚠️ Important Notes

### Data Quality Expectations

- **Name Matching**: ~95% of schools will match between datasets
- **Athletic Websites**: Many schools only have academic websites initially  
- **Financial Data**: Only available for schools that report to IPEDS
- **Geographic Precision**: Coordinates available for ~80% of schools

### Troubleshooting

**Common Issues:**

1. **School Name Mismatches**
   - The importer uses fuzzy matching for school names
   - Check `csv_import_staging` table for processing errors
   - Manual review may be needed for edge cases

2. **Missing Athletic Websites**
   - Initial import populates academic websites
   - Athletic-specific websites need separate research/scraping
   - Use the `school_websites` table to track different URL types

3. **Duplicate Data**  
   - Import script uses `UPSERT` to handle duplicates safely
   - Re-running imports will update existing records

### Performance Considerations

- Import processes ~60,000 total records
- Uses batch processing to avoid timeouts
- Database constraints prevent data corruption
- All operations are logged for auditing

## 📈 Next Steps After Import

1. **Verify Data Quality**
   ```bash
   # Check import statistics
   bun monitor:data-quality
   ```

2. **Update Athletic Websites**  
   ```bash
   # Research and add athletic department URLs
   bun scrape:hybrid --update-websites
   ```

3. **Test API Endpoints**
   ```bash
   # Verify enhanced data is accessible via API
   curl "http://localhost:3000/api/schools?include=metrics,location"
   ```

4. **Configure Scraping Targets**
   - Review `school_websites` table for scraping priorities
   - Set `scraping_difficulty` based on anti-bot protection
   - Update `athletic_website` URLs as needed

---

**Need Help?** Check the main project documentation in `CLAUDE.md` or create an issue with specific error messages.