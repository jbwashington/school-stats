#!/usr/bin/env bun

/**
 * Athletic Website URL Populator
 * Intelligently populates athletic website URLs using multiple strategies
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Known athletic website patterns for major schools
const KNOWN_ATHLETIC_WEBSITES: Record<string, string> = {
  // SEC
  'University of Alabama': 'https://rolltide.com',
  'Auburn University': 'https://auburntigers.com',
  'University of Florida': 'https://floridagators.com',
  'University of Georgia': 'https://georgiadogs.com',
  'University of Kentucky': 'https://ukathletics.com',
  'Louisiana State University': 'https://lsusports.net',
  'University of Mississippi': 'https://olemisssports.com',
  'Mississippi State University': 'https://hailstate.com',
  'University of South Carolina': 'https://gamecocksonline.com',
  'University of Tennessee': 'https://utsports.com',
  'Texas A&M University': 'https://12thman.com',
  'Vanderbilt University': 'https://vucommodores.com',
  'University of Arkansas': 'https://arkansasrazorbacks.com',
  'University of Missouri': 'https://mutigers.com',
  
  // Big Ten
  'University of Michigan': 'https://mgoblue.com',
  'Ohio State University': 'https://ohiostatebuckeyes.com',
  'Penn State University': 'https://gopsusports.com',
  'University of Wisconsin': 'https://uwbadgers.com',
  'University of Iowa': 'https://hawkeyesports.com',
  'University of Minnesota': 'https://gophersports.com',
  'University of Illinois': 'https://fightingillini.com',
  'Indiana University': 'https://iuhoosiers.com',
  'Michigan State University': 'https://msuspartans.com',
  'Northwestern University': 'https://nusports.com',
  'Purdue University': 'https://purduesports.com',
  'University of Nebraska': 'https://huskers.com',
  'Rutgers University': 'https://scarletknights.com',
  'University of Maryland': 'https://umterps.com',
  
  // ACC
  'Duke University': 'https://goduke.com',
  'University of North Carolina': 'https://goheels.com',
  'North Carolina State University': 'https://gopack.com',
  'Clemson University': 'https://clemsontigers.com',
  'Florida State University': 'https://seminoles.com',
  'University of Miami': 'https://hurricanesports.com',
  'Virginia Tech': 'https://hokiesports.com',
  'University of Virginia': 'https://virginiasports.com',
  'Wake Forest University': 'https://godemondeacons.com',
  'Georgia Tech': 'https://ramblinwreck.com',
  'Boston College': 'https://bceagles.com',
  'Syracuse University': 'https://cuse.com',
  'University of Pittsburgh': 'https://pittsburghpanthers.com',
  'University of Louisville': 'https://gocards.com',
  'University of Notre Dame': 'https://und.com',
  
  // Big 12
  'University of Texas': 'https://texassports.com',
  'University of Oklahoma': 'https://soonersports.com',
  'Oklahoma State University': 'https://okstate.com',
  'Texas Tech University': 'https://texastech.com',
  'Baylor University': 'https://baylorbears.com',
  'Texas Christian University': 'https://gofrogs.com',
  'University of Kansas': 'https://kuathletics.com',
  'Kansas State University': 'https://kstatesports.com',
  'Iowa State University': 'https://cyclones.com',
  'West Virginia University': 'https://wvusports.com',
  
  // Pac-12
  'University of Southern California': 'https://usctrojans.com',
  'University of California Los Angeles': 'https://uclabruins.com',
  'Stanford University': 'https://gostanford.com',
  'University of California Berkeley': 'https://calbears.com',
  'University of Oregon': 'https://goducks.com',
  'Oregon State University': 'https://osubeavers.com',
  'University of Washington': 'https://gohuskies.com',
  'Washington State University': 'https://wsucougars.com',
  'University of Arizona': 'https://arizonawildcats.com',
  'Arizona State University': 'https://thesundevils.com',
  'University of Colorado': 'https://cubuffs.com',
  'University of Utah': 'https://utahutes.com',
  
  // Other Major Programs
  'Gonzaga University': 'https://gozags.com',
  'Villanova University': 'https://villanova.com',
  'Georgetown University': 'https://guhoyas.com',
  'Marquette University': 'https://gomarquette.com',
  'Butler University': 'https://butlersports.com',
  'Xavier University': 'https://goxavier.com',
  'Creighton University': 'https://gocreighton.com',
  'Saint Johns University': 'https://redstormsports.com',
  'Providence College': 'https://friars.com',
  'Seton Hall University': 'https://pirateblu.com',
};

// Common athletic website patterns
const ATHLETIC_PATTERNS = [
  // Pattern: go[mascot].com
  { pattern: /^(.+)\s+(University|College)$/, transform: (name: string, mascot: string) => `https://go${mascot.toLowerCase()}.com` },
  // Pattern: [school][mascot].com  
  { pattern: /^(.+)\s+(University|College)$/, transform: (name: string, mascot: string) => `https://${name.toLowerCase().replace(/\s+/g, '')}${mascot.toLowerCase()}.com` },
  // Pattern: [school]athletics.com
  { pattern: /^(.+)\s+(University|College)$/, transform: (name: string) => `https://${name.toLowerCase().replace(/\s+/g, '')}athletics.com` },
  // Pattern: [school]sports.com
  { pattern: /^(.+)\s+(University|College)$/, transform: (name: string) => `https://${name.toLowerCase().replace(/\s+/g, '')}sports.com` },
];

async function populateAthleticWebsites() {
  console.log('🏫 Starting Athletic Website Population...');
  console.log('=' .repeat(50));
  
  // Get all schools without athletic websites
  const { data: schools, error } = await supabase
    .from('schools_ncaa_verified')
    .select('id, name, mascot, conference, athletic_division')
    .is('athletic_website', null);
    
  if (error) {
    console.error('❌ Error fetching schools:', error);
    return;
  }
  
  if (!schools || schools.length === 0) {
    console.log('✅ All schools already have athletic websites!');
    return;
  }
  
  console.log(`📊 Found ${schools.length} schools without athletic websites`);
  
  let knownUpdated = 0;
  let patternUpdated = 0;
  let totalProcessed = 0;
  
  for (const school of schools) {
    totalProcessed++;
    let athleticWebsite = '';
    let source = '';
    
    // Method 1: Check known websites
    const knownWebsite = KNOWN_ATHLETIC_WEBSITES[school.name];
    if (knownWebsite) {
      athleticWebsite = knownWebsite;
      source = 'known_database';
      knownUpdated++;
    }
    
    // Method 2: Try pattern matching if mascot is available
    if (!athleticWebsite && school.mascot) {
      // Try go[mascot].com pattern
      const mascotPattern = `https://go${school.mascot.toLowerCase().replace(/\s+/g, '')}.com`;
      athleticWebsite = mascotPattern;
      source = 'mascot_pattern';
      patternUpdated++;
    }
    
    // Method 3: Try school name patterns
    if (!athleticWebsite) {
      const cleanName = school.name
        .toLowerCase()
        .replace(/university|college|of|the/g, '')
        .replace(/\s+/g, '')
        .trim();
        
      if (cleanName.length > 2) {
        athleticWebsite = `https://${cleanName}athletics.com`;
        source = 'name_pattern';
        patternUpdated++;
      }
    }
    
    // Update database if we found a website
    if (athleticWebsite) {
      const { error: updateError } = await supabase
        .from('schools_ncaa_verified')
        .update({ 
          athletic_website: athleticWebsite,
          updated_at: new Date().toISOString()
        })
        .eq('id', school.id);
        
      if (updateError) {
        console.error(`❌ Error updating ${school.name}:`, updateError);
      } else {
        const status = source === 'known_database' ? '✅' : '🔗';
        console.log(`${status} ${school.name} -> ${athleticWebsite} (${source})`);
      }
    }
    
    // Progress indicator
    if (totalProcessed % 50 === 0) {
      console.log(`📈 Progress: ${totalProcessed}/${schools.length} schools processed`);
    }
  }
  
  console.log('\n📊 Population Summary:');
  console.log(`   - Schools processed: ${totalProcessed}`);
  console.log(`   - Known websites added: ${knownUpdated}`);
  console.log(`   - Pattern-based websites added: ${patternUpdated}`);
  console.log(`   - Total websites added: ${knownUpdated + patternUpdated}`);
  
  // Check how many schools now have websites
  const { count: withWebsites } = await supabase
    .from('schools_ncaa_verified')
    .select('id', { count: 'exact', head: true })
    .not('athletic_website', 'is', null);
    
  const { count: totalSchools } = await supabase
    .from('schools_ncaa_verified')
    .select('id', { count: 'exact', head: true });
    
  const coverage = ((withWebsites || 0) / (totalSchools || 1) * 100).toFixed(1);
  console.log(`\n🎯 Website Coverage: ${withWebsites}/${totalSchools} schools (${coverage}%)`);
  
  return {
    processed: totalProcessed,
    knownUpdated,
    patternUpdated,
    totalUpdated: knownUpdated + patternUpdated,
    coverage: parseFloat(coverage)
  };
}

async function main() {
  try {
    console.log('🚀 Athletic Website URL Populator');
    console.log('=' .repeat(50));
    
    const results = await populateAthleticWebsites();
    
    if (results && results.coverage > 80) {
      console.log('\n✅ Great! Website coverage is now above 80%');
      console.log('🔗 You can now run scraping operations:');
      console.log('   bun scrape:hybrid');
      console.log('   bun scrape:firecrawl');
    } else if (results && results.coverage > 50) {
      console.log('\n⚠️ Moderate website coverage. Consider:');
      console.log('   - Manual review of pattern-based URLs');
      console.log('   - Adding more known URLs to the database');
      console.log('   - Testing scraping on high-confidence schools');
    } else {
      console.log('\n❌ Low website coverage. Recommendations:');
      console.log('   - Review and enhance the known websites database');
      console.log('   - Improve pattern matching algorithms');
      console.log('   - Consider alternative data sources');
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { populateAthleticWebsites, KNOWN_ATHLETIC_WEBSITES };