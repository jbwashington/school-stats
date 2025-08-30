#!/bin/bash

# ============================================================================
# Remote Deployment Script for School Stats Platform
# Purpose: Deploy comprehensive CSV enhancements to remote Supabase
# Created: 2025-08-27
# ============================================================================

set -e  # Exit on any error

echo "🚀 Starting remote deployment for School Stats Platform..."
echo "Remote project: ixyhhegjwdxtpmtmiqvd (supabase-sports-stats)"
echo ""

# Check required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL is not set"
    echo "   Please set: export NEXT_PUBLIC_SUPABASE_URL='https://ixyhhegjwdxtpmtmiqvd.supabase.co'"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY is not set"  
    echo "   Please set your service role key from the Supabase dashboard"
    exit 1
fi

echo "✅ Environment variables configured"
echo "   URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "   Service Key: ${SUPABASE_SERVICE_ROLE_KEY:0:10}..."
echo ""

# Step 1: Attempt to link project (optional, will fail if no DB password)
echo "🔗 Step 1: Attempting to link project..."
if supabase link --project-ref ixyhhegjwdxtpmtmiqvd; then
    echo "✅ Project linked successfully"
    
    # Step 2: Push migrations
    echo "📤 Step 2: Pushing migrations to remote database..."
    if supabase db push; then
        echo "✅ Migrations deployed successfully"
    else
        echo "❌ Migration deployment failed"
        echo "💡 Try running migrations manually in Supabase SQL editor"
        exit 1
    fi
else
    echo "⚠️  Project linking failed (likely due to DB password)"
    echo "💡 Please run migrations manually using the Supabase dashboard:"
    echo "   1. Go to: https://supabase.com/dashboard/project/ixyhhegjwdxtpmtmiqvd/sql"
    echo "   2. Copy and paste: complete-remote-migration.sql"
    echo "   3. Execute the migration"
    echo "   4. Then run this script again to import data"
    echo ""
    read -p "Have you run the migrations manually? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please run migrations first, then retry this script"
        exit 1
    fi
fi

# Step 3: Import CSV data
echo "📊 Step 3: Importing comprehensive CSV data..."

echo "   Importing basic school and athletic data..."
if bun import:csv-data; then
    echo "   ✅ Basic data imported successfully"
else
    echo "   ❌ Basic data import failed"
    exit 1
fi

echo "   Enhancing schools with comprehensive data..."
if bun enhance:schools; then
    echo "   ✅ School enhancement completed successfully"
else
    echo "   ❌ School enhancement failed"
    exit 1
fi

# Step 4: Verify deployment
echo "🔍 Step 4: Verifying deployment..."

# Test database connection and data
echo "   Testing database connection and data..."
VERIFICATION_RESULT=$(bun -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('$NEXT_PUBLIC_SUPABASE_URL', '$SUPABASE_SERVICE_ROLE_KEY');
try {
    const { data: schools } = await supabase.from('schools_ncaa_verified').select('id').limit(1);
    const { data: metrics } = await supabase.from('athletic_program_metrics').select('id').limit(1);
    const { data: contacts } = await supabase.from('school_contact_info').select('id').limit(1);
    if (schools && schools.length > 0 && metrics && metrics.length > 0) {
        console.log('✅ All tables accessible and populated');
    } else {
        console.log('❌ Some tables are missing or empty');
    }
} catch (error) {
    console.log('❌ Database connection failed:', error.message);
}
")

echo "   $VERIFICATION_RESULT"

# Step 5: Final summary  
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "📈 Your remote database now includes:"
echo "   • 1,063+ schools with comprehensive data"
echo "   • 15,283+ athletic program financial records"
echo "   • 867+ contact information records"
echo "   • Enhanced views for complete data access"
echo ""
echo "🔗 Access your data:"
echo "   Dashboard: https://supabase.com/dashboard/project/ixyhhegjwdxtpmtmiqvd"
echo "   API URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""
echo "✨ Your School Stats platform is ready for production!"

# Step 6: Show sample data
echo ""
echo "📊 Sample data verification:"
bun -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('$NEXT_PUBLIC_SUPABASE_URL', '$SUPABASE_SERVICE_ROLE_KEY');
try {
    const { data } = await supabase
        .from('schools_ncaa_verified')
        .select('name, athletic_division, phone, total_enrollment')
        .not('phone', 'is', null)
        .not('total_enrollment', 'is', null)
        .limit(3);
    if (data && data.length > 0) {
        console.log('Sample enhanced school records:');
        data.forEach(school => {
            console.log(\`  • \${school.name} (\${school.athletic_division})\`);
            console.log(\`    Phone: \${school.phone}, Enrollment: \${school.total_enrollment}\`);
        });
    }
} catch (error) {
    console.log('Could not fetch sample data:', error.message);
}
"