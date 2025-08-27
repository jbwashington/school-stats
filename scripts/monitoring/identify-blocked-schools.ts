#!/usr/bin/env bun

import { createServiceRoleClient } from '@/lib/supabase/service-role';

async function identifyBlockedSchools() {
  const supabase = createServiceRoleClient();
  
  console.log('🎯 Identifying high-value blocked programs for DIY targeting...\n');
  
  // Get all schools and check which ones have failed scraping
  const { data: schools } = await supabase
    .from('schools_ncaa_verified')
    .select('id, name, athletic_website, conference, athletic_division, state')
    .order('id');
    
  if (!schools) return;
  
  // Check which schools have successfully scraped coaches
  const { data: successfulSchools } = await supabase
    .from('athletic_staff')
    .select('ncaa_school_id')
    .not('ncaa_school_id', 'is', null);
    
  const successfulIds = new Set(successfulSchools?.map(s => s.ncaa_school_id) || []);
  
  // Categorize schools by recruitment value and success status
  const powerConferences = ['SEC', 'Big Ten', 'Pac-12', 'Big 12', 'ACC'];
  
  const schoolAnalysis = schools.map(school => {
    const hasCoaches = successfulIds.has(school.id);
    const isPowerConference = powerConferences.some(conf => 
      school.conference?.toLowerCase().includes(conf.toLowerCase())
    );
    
    return {
      ...school,
      hasCoaches,
      isPowerConference,
      priority: isPowerConference && !hasCoaches ? 'HIGH' : 
               isPowerConference && hasCoaches ? 'MEDIUM' :
               !isPowerConference && !hasCoaches ? 'LOW' : 'SUCCESS'
    };
  });
  
  // Group by priority
  const highPriority = schoolAnalysis.filter(s => s.priority === 'HIGH');
  const successful = schoolAnalysis.filter(s => s.priority === 'SUCCESS');
  const blocked = schoolAnalysis.filter(s => !s.hasCoaches);
  
  console.log('📊 School Success Analysis:');
  console.log(`✅ Successful: ${successful.length}/${schools.length} schools (${((successful.length/schools.length)*100).toFixed(1)}%)`);
  console.log(`❌ Blocked/Failed: ${blocked.length}/${schools.length} schools (${((blocked.length/schools.length)*100).toFixed(1)}%)`);
  
  console.log('\n🎯 HIGH PRIORITY for DIY (Power Conference + Blocked):');
  highPriority.forEach(school => {
    console.log(`  🔥 ${school.name} (${school.conference})`);
    console.log(`     Website: ${school.athletic_website}`);
    console.log(`     State: ${school.state}`);
  });
  
  console.log('\n✅ Currently Successful Schools:');
  successful.slice(0, 5).forEach(school => {
    console.log(`  ✅ ${school.name} (${school.conference})`);
  });
  if (successful.length > 5) {
    console.log(`     ... and ${successful.length - 5} others`);
  }
  
  // Calculate potential ROI
  const currentSuccessRate = (successful.length / schools.length) * 100;
  const potentialWithDIY = successful.length + (highPriority.length * 0.75); // Assume 75% success with DIY
  const potentialSuccessRate = (potentialWithDIY / schools.length) * 100;
  
  console.log('\n📈 Hybrid Strategy Potential:');
  console.log(`Current Success Rate: ${currentSuccessRate.toFixed(1)}%`);
  console.log(`Potential with DIY: ${potentialSuccessRate.toFixed(1)}%`);
  console.log(`Improvement: +${(potentialSuccessRate - currentSuccessRate).toFixed(1)} percentage points`);
  
  return {
    highPriority,
    successful, 
    currentSuccessRate,
    potentialSuccessRate
  };
}

identifyBlockedSchools();