# 🚀 Remote Database Deployment Guide

## Overview
This guide will help you deploy all the comprehensive CSV data enhancements to your remote Supabase database (`ixyhhegjwdxtpmtmiqvd` - supabase-sports-stats).

## 📋 What Will Be Deployed

### Database Enhancements:
- **4 new tables** with comprehensive school data
- **30+ new columns** added to existing tables  
- **Enhanced views** for complete data access
- **1,063 schools** with NCAA DI/DII/DIII divisions
- **15,283+ athletic program records** 
- **867 contact records** with phone/address data
- **857 enrollment analytics records**

## 🔧 Deployment Options

### Option 1: Manual SQL Deployment (Recommended)

1. **Copy the complete migration file**: `/complete-remote-migration.sql`
2. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/ixyhhegjwdxtpmtmiqvd/sql
3. **Paste and execute** the migration SQL
4. **Run data import** (see Option 2)

### Option 2: CLI Deployment (if you have DB password)

```bash
# Set environment variables for remote
export SUPABASE_DB_PASSWORD="your-production-db-password"
export NEXT_PUBLIC_SUPABASE_URL="https://ixyhhegjwdxtpmtmiqvd.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Link and deploy
supabase link --project-ref ixyhhegjwdxtpmtmiqvd
supabase db push
```

## 📊 Data Import After Migration

Once the schema is deployed, import the comprehensive data:

```bash
# Import basic school and athletic data  
NEXT_PUBLIC_SUPABASE_URL="https://ixyhhegjwdxtpmtmiqvd.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
bun import:csv-data

# Enhance schools with comprehensive data
NEXT_PUBLIC_SUPABASE_URL="https://ixyhhegjwdxtpmtmiqvd.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
bun enhance:schools
```

## 🔑 Required Environment Variables

Make sure these are set in your production environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ixyhhegjwdxtpmtmiqvd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.ixyhhegjwdxtpmtmiqvd:[password]@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

## 🎯 Verification After Deployment

Run these queries in your Supabase SQL editor to verify:

```sql
-- Check total schools
SELECT COUNT(*) as total_schools FROM schools_ncaa_verified;

-- Check data coverage  
SELECT 
  'Schools with Phone' as metric,
  COUNT(*) || ' (' || ROUND(COUNT(*)::decimal / (SELECT COUNT(*) FROM schools_ncaa_verified) * 100, 1) || '%)' as coverage
FROM schools_ncaa_verified WHERE phone IS NOT NULL;

-- Check athletic program data
SELECT COUNT(*) as athletic_records FROM athletic_program_metrics;

-- Test comprehensive view
SELECT name, phone, total_enrollment, latitude, longitude 
FROM schools_ncaa_verified 
WHERE phone IS NOT NULL AND total_enrollment IS NOT NULL 
LIMIT 5;
```

## 📈 Expected Results

After successful deployment:
- ✅ **1,063 schools** (NCAA DI: 356, DII: 283, DIII: 424)
- ✅ **80.8% coverage** for phone numbers
- ✅ **78.9% coverage** for enrollment data  
- ✅ **81.6% coverage** for coordinates
- ✅ **15,283+ athletic program records**

## 🔄 Rollback Plan

If anything goes wrong, the migrations use `IF NOT EXISTS` and are non-destructive. You can:
1. Drop the new tables if needed
2. Remove added columns (though this will lose data)
3. Restore from backup

## 🆘 Troubleshooting

### Issue: Connection/Permission Errors
- Verify your service role key has the right permissions
- Check that your database password is correct
- Ensure your IP is whitelisted if restrictions are enabled

### Issue: Migration Errors
- Run migrations one at a time to identify the specific issue
- Check for existing conflicting table/column names
- Verify PostgreSQL version compatibility

## 🎉 Next Steps After Deployment

1. **Test the API endpoints** with new data
2. **Update your application** to use the enhanced views
3. **Set up monitoring** for data quality
4. **Schedule periodic imports** for data updates

---

Ready to deploy? Choose Option 1 (Manual SQL) or Option 2 (CLI) above!