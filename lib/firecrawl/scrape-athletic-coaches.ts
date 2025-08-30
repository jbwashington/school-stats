#!/usr/bin/env bun

/**
 * Athletic Coaches Scraper
 * Scrapes COACHES ONLY (no faculty) from school athletic websites
 * Focuses on scholarship-relevant coaching staff for recruitment
 */

import { firecrawlApp } from '@/lib/vendors/firecrawl';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import fs from 'fs/promises';

interface AthleticCoach {
  // Basic Information (matching current DB schema)
  name: string;
  title: string; // "Head Coach", "Assistant Coach" - COACHES ONLY
  sport?: string; // Will map to sport_id
  
  // Contact Information
  email?: string;
  phone?: string;
  
  // Additional Details
  bio?: string; // Match DB column name
  photo_url?: string; // Match DB column name
  
  // Coaching-Specific Fields (NO FACULTY/ACADEMIC STAFF)
  isRecruitingCoordinator?: boolean;
  contact_priority: 1 | 2; // 1=Head Coach, 2=Assistant Coach ONLY
  
  // Data Quality & Source Tracking
  firecrawl_confidence: number;
  scraping_source: 'athletic_website' | 'academic_website';
  last_verified_at: string;
}

interface SchoolCoachingData {
  school_id: number;
  school_name: string;
  athletic_website: string;
  coaches: AthleticCoach[];
  scraping_stats: {
    total_staff_found: number;
    coaches_identified: number;
    faculty_excluded: number;
    success_rate: number;
  };
}

/**
 * AI prompt for extracting COACHES ONLY (no faculty/academic staff)
 */
const COACH_EXTRACTION_PROMPT = `
Extract COACHING STAFF ONLY from this athletic website. 

INCLUDE ONLY:
- Head Coaches
- Assistant Coaches  
- Associate Head Coaches
- Recruiting Coordinators
- Volunteer Coaches
- Graduate Assistant Coaches

EXCLUDE ALL:
- Faculty members
- Academic advisors
- Professors
- Administrators (unless they're also coaches)
- Support staff (trainers, managers, etc.)
- Academic coordinators

For each COACH, extract:
- Full name
- Exact title (Head Coach, Assistant Coach, etc.)
- Sport/team they coach
- Email address
- Phone number
- Brief bio/background
- Photo URL if available
- Whether they handle recruiting

Focus on people who can directly impact athletic scholarships and recruitment decisions.
Return as structured JSON with high confidence scores for coaching staff only.
`;

/**
 * Scrape coaches from a school's athletic website
 */
async function scrapeSchoolCoaches(
  school_id: number,
  school_name: string,
  athletic_website: string
): Promise<SchoolCoachingData> {
  console.log(`🏀 Scraping coaches from ${school_name}...`);
  console.log(`   URL: ${athletic_website}`);

  const result: SchoolCoachingData = {
    school_id,
    school_name,
    athletic_website,
    coaches: [],
    scraping_stats: {
      total_staff_found: 0,
      coaches_identified: 0,
      faculty_excluded: 0,
      success_rate: 0,
    },
  };

  try {
    // Primary scrape: Athletic website staff directory
    const staffResult = await firecrawlApp.scrapeUrl(
      `${athletic_website}/staff`,
      {
        formats: ['markdown'],
        onlyMainContent: true,
      }
    );

    if (staffResult.success && (staffResult as any).markdown) {
      const staffData = await extractCoachesFromContent(
        (staffResult as any).markdown,
        'athletic_website'
      );
      result.coaches.push(...staffData);
    }

    // Secondary scrape: Try common coaching staff pages
    const coachingPages = [
      '/coaches',
      '/coaching-staff',
      '/athletics/staff',
      '/sports/staff',
    ];

    for (const page of coachingPages) {
      try {
        const pageResult = await firecrawlApp.scrapeUrl(
          `${athletic_website}${page}`,
          {
            formats: ['markdown'],
            onlyMainContent: true,
          }
        );

        if (pageResult.success && (pageResult as any).markdown) {
          const pageCoaches = await extractCoachesFromContent(
            (pageResult as any).markdown,
            'athletic_website'
          );
          
          // Merge coaches, avoiding duplicates
          pageCoaches.forEach((coach) => {
            const exists = result.coaches.some(
              (existing) => 
                existing.name.toLowerCase() === coach.name.toLowerCase() &&
                existing.sport === coach.sport
            );
            if (!exists) {
              result.coaches.push(coach);
            }
          });
        }
      } catch (error) {
        console.log(`   ⚠️  Could not access ${page}: ${error}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Calculate success metrics
    result.scraping_stats = {
      total_staff_found: result.coaches.length + result.scraping_stats.faculty_excluded,
      coaches_identified: result.coaches.length,
      faculty_excluded: result.scraping_stats.faculty_excluded,
      success_rate: result.coaches.length > 0 ? 
        (result.coaches.length / Math.max(result.coaches.length + result.scraping_stats.faculty_excluded, 1)) * 100 : 0,
    };

    console.log(`   ✅ Found ${result.coaches.length} coaches`);
    console.log(`   📊 Success rate: ${result.scraping_stats.success_rate.toFixed(1)}%`);

  } catch (error) {
    console.error(`   ❌ Error scraping ${school_name}:`, error);
  }

  return result;
}

/**
 * Validate and clean extracted names
 */
function validateAndCleanName(name: string): string | null {
  if (!name) return null;
  
  // Remove common prefixes and suffixes that get captured
  const cleaned = name
    .replace(/^(The|A|An)\s+/i, '') // Remove articles
    .replace(/\s+(Coach|Coaching|Staff|Department|Athletics?)$/i, '') // Remove suffixes
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .replace(/\s+/g, ' '); // Normalize whitespace
  
  // Validate name structure
  const nameParts = cleaned.split(' ').filter(part => part.length > 1);
  
  // Must have at least 2 parts (first + last name)
  if (nameParts.length < 2) return null;
  
  // Each part must start with capital letter
  if (!nameParts.every(part => /^[A-Z]/.test(part))) return null;
  
  // Reject names with numbers or problematic special characters
  if (/[0-9@#$%^&*()+={}[\]|\\:";?/><]/.test(cleaned)) return null;
  
  // Reject obviously bad patterns
  const badPatterns = [
    /^(Head|Assistant|Associate|Coach|Staff|Department|Athletics?|Sports?|Performance)$/i,
    /^(The|A|An|Of|For|With|And|Or|But)$/i,
    /ing$/i, // Ends with "ing" (like "ing-staff")
    /^[a-z]/, // Starts with lowercase
    /(Ad|Blocker|Detected|Events|Available|Upcoming|No|Skip|Main|Content)/i, // Website UI elements
    /(JavaScript|Browser|Error|Loading|Please|Click|Here)/i, // Technical/UI terms
    /(Play|Video|Toggle|Media|Overlay|Image|Related|Download)/i, // Media UI elements
    /^(Menu|Navigation|Search|Login|Register|Subscribe|Follow)$/i, // Navigation elements
    /^(Facebook|Twitter|Instagram|YouTube|LinkedIn)$/i, // Social media
  ];
  
  for (const pattern of badPatterns) {
    if (pattern.test(cleaned)) return null;
  }
  
  // Length validation (reasonable name length)
  if (cleaned.length < 4 || cleaned.length > 40) return null;
  
  return cleaned;
}

/**
 * Check if a name appears in a coaching context within the content
 */
function isNameInCoachingContext(name: string, content: string): boolean {
  // Look for the name followed by coaching-related terms within reasonable distance
  const contextPattern = new RegExp(
    `${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^|]*?(?:Coach|Assistant|Head|Associate|Volunteer|Graduate|Coordinator|Staff|Athletics|Sports)`, 
    'i'
  );
  
  // Also check for reverse pattern (title before name)
  const reversePattern = new RegExp(
    `(?:Coach|Assistant|Head|Associate|Volunteer|Graduate|Coordinator)[^|]*?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 
    'i'
  );
  
  return contextPattern.test(content) || reversePattern.test(content);
}

/**
 * Extract contact information for a specific coach name
 */
function extractContactInfo(name: string, content: string): { email?: string; phone?: string } {
  const result: { email?: string; phone?: string } = {};
  
  // Escape name for regex
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Look for email addresses near the coach's name (within 500 characters)
  const nameIndex = content.toLowerCase().indexOf(name.toLowerCase());
  if (nameIndex !== -1) {
    const contextWindow = content.substring(
      Math.max(0, nameIndex - 250), 
      Math.min(content.length, nameIndex + name.length + 250)
    );
    
    // Email patterns
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const emailMatch = emailPattern.exec(contextWindow);
    if (emailMatch) {
      result.email = emailMatch[1];
    }
    
    // Phone patterns (various formats)
    const phonePatterns = [
      /(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g, // (123) 456-7890 or 123-456-7890
      /(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g, // 123.456.7890
      /([0-9]{3}[-.\s][0-9]{3}[-.\s][0-9]{4})/g, // 123 456 7890
    ];
    
    for (const phonePattern of phonePatterns) {
      const phoneMatch = phonePattern.exec(contextWindow);
      if (phoneMatch) {
        result.phone = phoneMatch[1];
        break; // Use first match
      }
    }
  }
  
  return result;
}

/**
 * Extract sport and title information for a specific coach
 */
function extractSportAndTitle(name: string, content: string): { sport: string; title: string } {
  const result = { sport: 'General Athletics', title: 'Assistant Coach' }; // Defaults
  
  // Escape name for regex
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Look for sport and title context around the coach's name (within 300 characters)
  const nameIndex = content.toLowerCase().indexOf(name.toLowerCase());
  if (nameIndex !== -1) {
    const contextWindow = content.substring(
      Math.max(0, nameIndex - 150), 
      Math.min(content.length, nameIndex + name.length + 150)
    );
    
    // Sport detection patterns
    const sportPatterns = {
      'Football': /football|gridiron/i,
      'Basketball': /basketball|hoops/i,
      'Baseball': /baseball/i,
      'Softball': /softball/i,
      'Soccer': /soccer|football(?!.*american)/i,
      'Tennis': /tennis/i,
      'Golf': /golf/i,
      'Swimming': /swimming|aquatics/i,
      'Track and Field': /track|field|cross.country|distance/i,
      'Volleyball': /volleyball/i,
      'Lacrosse': /lacrosse/i,
      'Wrestling': /wrestling/i,
      'Field Hockey': /field.hockey/i,
      'Gymnastics': /gymnastics/i,
      'Rowing': /rowing|crew/i,
      'Ice Hockey': /ice.hockey|hockey/i,
      'Water Polo': /water.polo/i,
    };
    
    // Check for sport matches
    for (const [sport, pattern] of Object.entries(sportPatterns)) {
      if (pattern.test(contextWindow)) {
        result.sport = sport;
        break; // Use first match
      }
    }
    
    // Title detection patterns (look for actual coaching titles)
    const titlePatterns = [
      { pattern: /associate\s+head\s+coach/i, title: 'Associate Head Coach' }, // Check this first (more specific)
      { pattern: /head\s+.*coach/i, title: 'Head Coach' }, // Allows "Head Football Coach", "Head Basketball Coach" 
      { pattern: /assistant\s+.*coach/i, title: 'Assistant Coach' }, // Allows "Assistant Football Coach"
      { pattern: /volunteer\s+coach/i, title: 'Volunteer Coach' },
      { pattern: /graduate\s+assistant/i, title: 'Graduate Assistant Coach' },
      { pattern: /recruiting\s+coordinator/i, title: 'Recruiting Coordinator' },
      { pattern: /director.*athletics/i, title: 'Athletics Director' },
      { pattern: /strength.*conditioning/i, title: 'Strength & Conditioning Coach' },
    ];
    
    // Check for title matches
    for (const { pattern, title } of titlePatterns) {
      if (pattern.test(contextWindow)) {
        result.title = title;
        break; // Use first match
      }
    }
    
    // Special cases: Look for endowed positions
    if (/endowed.*head/i.test(contextWindow)) {
      result.title = 'Head Coach';
    }
  }
  
  return result;
}

/**
 * Extract coaches from scraped content using enhanced pattern matching
 */
async function extractCoachesFromContent(
  content: string,
  source: 'athletic_website' | 'academic_website'
): Promise<AthleticCoach[]> {
  try {
    console.log('    🔍 Analyzing content for coaches...');
    console.log('    📝 Content length:', content.length, 'characters');
    console.log('    📝 Content preview:', content.substring(0, 200));
    
    // Enhanced pattern matching for coaches - handles multiple content formats
    const coachPatterns = [
      // Pattern 1: Table format "| [Name](link) | Title with Coach |"
      /\|\s*\[([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\]\([^)]+\)\s*\|\s*[^|]*(?:Coach|Coordinator|Staff)/gi,
      
      // Pattern 2: Table format without links "| Name | Title with Coach |"
      /\|\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*\|\s*[^|]*(?:Coach|Coordinator|Assistant|Head)/gi,
      
      // Pattern 3: "Head Coach: John Smith" or "Assistant Coach John Smith"
      /(?:Head\s+Coach|Assistant\s+Coach|Associate\s+Head\s+Coach|Volunteer\s+Coach|Graduate\s+Assistant\s+Coach)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
      
      // Pattern 4: "John Smith - Head Coach" or "John Smith, Assistant Coach"  
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)[\s\-–,]+(?:Head\s+Coach|Assistant\s+Coach|Associate\s+Head\s+Coach|Volunteer\s+Coach|Graduate\s+Assistant\s+Coach)/gi,
      
      // Pattern 5: Names followed by coaching titles in separate lines (common in lists)
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*$/gm, // Capture names on their own lines
    ];
    
    const foundCoaches: string[] = [];
    const seenNames = new Set<string>(); // Prevent duplicates
    
    for (const pattern of coachPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const rawName = match[1].trim();
        const cleanName = validateAndCleanName(rawName);
        
        // For table patterns, also verify the title contains coaching keywords
        if (cleanName && !seenNames.has(cleanName.toLowerCase())) {
          // Check if this name appears in a coaching context
          if (isNameInCoachingContext(cleanName, content)) {
            foundCoaches.push(cleanName);
            seenNames.add(cleanName.toLowerCase());
          }
        }
      }
    }
    
    console.log('    👥 Pattern-matched coaches found:', foundCoaches.length);
    if (foundCoaches.length > 0) {
      console.log('    📋 Coaches:', foundCoaches.slice(0, 5)); // Show first 5
    }
    
    // Extract additional contact information and detect sports/titles
    const coachesWithContact = foundCoaches.map(name => {
      const contactInfo = extractContactInfo(name, content);
      const sportInfo = extractSportAndTitle(name, content);
      return {
        name,
        title: sportInfo.title,
        sport: sportInfo.sport,
        email: contactInfo.email,
        phone: contactInfo.phone,
        firecrawl_confidence: 0.7
      };
    });
    
    // Convert to coach objects
    const extractionResult = {
      success: foundCoaches.length > 0,
      data: {
        coaches: coachesWithContact
      }
    };

    console.log('    🤖 Extraction result:', extractionResult.success ? '✅ Success' : '❌ Failed');

    if (extractionResult.success && extractionResult.data) {
      const extractData = extractionResult.data as { coaches?: unknown[] };
      const coaches = extractData.coaches || [];
      console.log('    👥 Raw coaches found:', coaches.length);
      
      return coaches
        .filter((person: unknown): person is Record<string, unknown> => 
          typeof person === 'object' && 
          person !== null && 
          'title' in person && 
          isCoachingPosition(String((person as Record<string, unknown>).title))
        )
        .map((coach: Record<string, unknown>) => ({
          name: String(coach.name || ''),
          title: normalizeCoachTitle(String(coach.title || '')),
          sport: coach.sport ? String(coach.sport) : undefined,
          email: coach.email ? String(coach.email) : undefined,
          phone: coach.phone ? String(coach.phone) : undefined,
          bio: coach.bio ? String(coach.bio) : undefined,
          photo_url: coach.photo_url ? String(coach.photo_url) : undefined,
          isRecruitingCoordinator: Boolean(coach.isRecruitingCoordinator) || false,
          contact_priority: determineContactPriority(String(coach.title || '')),
          firecrawl_confidence: typeof coach.firecrawl_confidence === 'number' ? coach.firecrawl_confidence : 0.8,
          scraping_source: source,
          last_verified_at: new Date().toISOString(),
        }));
    }
  } catch (error) {
    console.error('Error extracting coaches from content:', error);
  }

  return [];
}

/**
 * Determine if a title represents a coaching position (not faculty)
 */
function isCoachingPosition(title: string): boolean {
  if (!title) return false;
  
  const coachingTitles = [
    'head coach',
    'assistant coach', 
    'associate head coach',
    'recruiting coordinator',
    'volunteer coach',
    'graduate assistant',
    'coach',
  ];
  
  const facultyTitles = [
    'professor',
    'instructor',
    'lecturer',
    'advisor',
    'coordinator',
    'administrator',
    'director',
    'manager',
  ];
  
  const lowerTitle = title.toLowerCase();
  
  // Exclude obvious faculty/academic positions
  if (facultyTitles.some(faculty => lowerTitle.includes(faculty) && !lowerTitle.includes('coach'))) {
    return false;
  }
  
  // Include coaching positions
  return coachingTitles.some(coaching => lowerTitle.includes(coaching));
}

/**
 * Normalize coach titles to match database standards
 */
function normalizeCoachTitle(title: string): string {
  if (!title) return 'Assistant Coach';
  
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('head coach')) return 'Head Coach';
  if (lowerTitle.includes('assistant') || lowerTitle.includes('associate')) return 'Assistant Coach';
  if (lowerTitle.includes('volunteer')) return 'Assistant Coach';
  if (lowerTitle.includes('graduate assistant')) return 'Assistant Coach';
  
  return 'Assistant Coach'; // Default for coaching positions
}

/**
 * Determine contact priority based on title
 */
function determineContactPriority(title: string): 1 | 2 {
  if (!title) return 2;
  
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('head coach')) return 1; // Highest priority
  
  return 2; // Assistant coaches and others
}

/**
 * Scrape coaches from multiple schools
 */
async function scrapeCoachesFromSchools(schoolIds?: number[]): Promise<void> {
  console.log('🏀 Starting Athletic Coaches Scraping...\n');
  
  const supabase = createServiceRoleClient();
  
  // Get schools to scrape from NCAA verified table
  let query = supabase
    .from('schools_ncaa_verified')
    .select('id, name, athletic_website')
    .not('athletic_website', 'is', null);
  
  if (schoolIds) {
    query = query.in('id', schoolIds);
  }
  
  const { data: schools, error } = await query.limit(50); // Start with batch of 50
  
  if (error) {
    console.error('❌ Error fetching schools:', error);
    return;
  }
  
  if (!schools?.length) {
    console.log('⚠️  No schools found with athletic websites');
    return;
  }
  
  console.log(`📋 Found ${schools.length} schools to scrape\n`);
  
  const results: SchoolCoachingData[] = [];
  
  for (let i = 0; i < schools.length; i++) {
    const school = schools[i];
    
    console.log(`[${i + 1}/${schools.length}] ${school.name}`);
    
    if (!school.athletic_website) {
      console.log('   ⚠️  No athletic website found, skipping');
      continue;
    }
    
    const schoolResult = await scrapeSchoolCoaches(
      school.id,
      school.name,
      school.athletic_website
    );
    
    results.push(schoolResult);
    
    // Save coaches to database - commented out for build
    // if (schoolResult.coaches.length > 0) {
    //   await saveCoachesToDatabase(schoolResult);
    // }
    
    // Rate limiting between schools
    if (i < schools.length - 1) {
      console.log('   ⏱️  Waiting 3 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Save summary report
  await saveScrapeReport(results);
  
  console.log('\n🎉 Coaching staff scraping completed!');
}

/**
 * Save coaches to database
 */
// Commented out for build - contains references to non-existent tables
/*
async function saveCoachesToDatabase(schoolData: SchoolCoachingData): Promise<void> {
  const supabase = createServiceRoleClient();
  
  for (const coach of schoolData.coaches) {
    try {
      // Get sport_id - try exact match first, then fallback to Basketball
      let sport;
      if (coach.sport && coach.sport !== 'General Athletics') {
        const { data: exactSport } = await supabase
          .from('sports')
          .select('id')
          .ilike('sport', coach.sport)
          .single();
        sport = exactSport;
      }
      
      // Fallback to Basketball if no sport match found
      if (!sport) {
        const { data: fallbackSport } = await supabase
          .from('sports')
          .select('id')
          .ilike('sport', 'Basketball')
          .single();
        sport = fallbackSport;
      }
      
      // Assume male gender for now - could be enhanced with AI detection
      const { data: gender } = await supabase
        .from('genders')
        .select('id')
        .eq('name', 'Male')
        .single();
      
      const { error } = await supabase
        .from('athletic_staff')
        .insert({
          ncaa_school_id: schoolData.school_id, // Use NCAA school reference
          sport_id: sport?.id,
          gender_id: gender?.id,
          name: coach.name,
          title: coach.title,
          email: coach.email,
          phone: coach.phone,
          bio: coach.bio,
          photo_url: coach.photo_url,
          // Enhanced fields from migration
          contact_priority: coach.contact_priority,
          recruiting_coordinator: coach.isRecruitingCoordinator,
          firecrawl_confidence: coach.firecrawl_confidence,
          scraping_source: coach.scraping_source,
          last_verified_at: coach.last_verified_at,
        });
      
      if (error) {
        console.error(`   ❌ Error saving coach ${coach.name}:`, error);
      } else {
        console.log(`   ✅ Saved coach: ${coach.name} (${coach.title})`);
      }
    } catch (error) {
      console.error(`   ❌ Error processing coach ${coach.name}:`, error);
    }
  }
}
*/

/**
 * Save scraping report
 */
async function saveScrapeReport(results: SchoolCoachingData[]): Promise<void> {
  const report = {
    timestamp: new Date().toISOString(),
    schools_processed: results.length,
    total_coaches_found: results.reduce((sum, r) => sum + r.coaches.length, 0),
    average_coaches_per_school: results.length > 0 ? 
      results.reduce((sum, r) => sum + r.coaches.length, 0) / results.length : 0,
    overall_success_rate: results.length > 0 ?
      results.reduce((sum, r) => sum + r.scraping_stats.success_rate, 0) / results.length : 0,
    schools: results,
  };
  
  await fs.writeFile(
    `coach-scraping-report-${Date.now()}.json`,
    JSON.stringify(report, null, 2)
  );
  
  console.log(`📊 Scraping report saved: coach-scraping-report-${Date.now()}.json`);
}

// Export for use in other scripts
export { scrapeSchoolCoaches, scrapeCoachesFromSchools as scrapeAthleticCoaches };
export type { AthleticCoach, SchoolCoachingData };

// Run if called directly
if (import.meta.main) {
  const schoolIds = process.argv[2] ? [parseInt(process.argv[2])] : undefined;
  scrapeCoachesFromSchools(schoolIds);
}