#!/usr/bin/env bun

/**
 * Athletic Coach Scraper using Stealth Puppeteer
 * Advanced scraper for major programs blocked by Firecrawl
 */

import { StealthScraper } from './stealth-scraper';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

interface CoachData {
  name: string;
  title: string;
  sport: string;
  email?: string;
  phone?: string;
  bio?: string;
  confidence: number;
}

interface SchoolScrapingResult {
  school_id: number;
  school_name: string;
  success: boolean;
  coaches: CoachData[];
  source_url: string;
  scraping_time: number;
  error?: string;
}

class AthleticCoachScraper {
  private scraper: StealthScraper;
  
  constructor() {
    this.scraper = new StealthScraper();
  }
  
  /**
   * Common staff page URL patterns for athletic websites
   */
  private getStaffUrlPatterns(baseUrl: string): string[] {
    const cleanBase = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    
    return [
      // Direct staff/coach pages
      `${cleanBase}/staff`,
      `${cleanBase}/coaches`,
      `${cleanBase}/coaching-staff`,
      `${cleanBase}/athletics/staff`,
      `${cleanBase}/sports/staff`,
      `${cleanBase}/directory/staff`,
      `${cleanBase}/staff-directory`,
      `${cleanBase}/about/staff`,
      `${cleanBase}/administration`,
      
      // Sport-specific coach pages (Alabama might list coaches per sport)
      `${cleanBase}/sports/football/coaches`,
      `${cleanBase}/sports/m-baskbl/coaches`, 
      `${cleanBase}/sports/w-baskbl/coaches`,
      `${cleanBase}/sports/baseball/coaches`,
      `${cleanBase}/sports/softball/coaches`,
      `${cleanBase}/football/coaches`,
      `${cleanBase}/basketball/coaches`,
      
      cleanBase, // Main page might have staff info
    ];
  }
  
  /**
   * Extract coach information from HTML content
   */
  private extractCoachesFromContent(content: string, sourceUrl: string): CoachData[] {
    const coaches: CoachData[] = [];
    
    // Debug: Save sample of content to analyze structure
    if (content.length > 100000) {
      console.log(`   🔍 Analyzing large content (${content.length} chars) for patterns...`);
      
      // Save sample for analysis if this is staff-directory (the largest)
      if (sourceUrl.includes('staff-directory') && content.length > 1000000) {
        const sample = content.substring(0, 10000);
        console.log(`   📝 Sample content:\n${sample.substring(0, 2000)}...\n`);
      }
    }
    
    // Enhanced patterns for coach extraction including Alabama-style patterns
    const coachPatterns = [
      // Alabama table row format: "Name Title Phone" (extracted from table rows)
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+)\s+((?:Head\s+Coach|Assistant\s+Head\s+Coach|Co-.*?|Offensive\s+Coordinator|Defensive\s+Coordinator|Special\s+Teams\s+Coordinator|.*?Coordinator|.*?Coach|Assistant\s+Coach)[^0-9]*?)\s*(?:\d{3}-\d{3}-\d{4}|\d{10})/gi,
      
      // Alabama staff card format: class="sidearm-roster-player-name">Name</h3> ... class="sidearm-roster-player-position">Title</div>
      /<[^>]*class="[^"]*(?:sidearm-roster-player-name|staff-name|name)[^"]*"[^>]*>([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+)[^<]*<\/[^>]+>.*?class="[^"]*(?:sidearm-roster-player-position|staff-position|title|position)[^"]*"[^>]*>([^<]*(?:Coach|Coordinator|Director|Manager)[^<]*)<\/[^>]+>/gi,
      
      // Generic staff directory format
      /<(?:div|td|span|h\d)[^>]*class="[^"]*(?:staff|coach|name)[^"]*"[^>]*>([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+)[^<]*<\/(?:div|td|span|h\d)>.*?<(?:div|td|span)[^>]*class="[^"]*(?:title|position|role)[^"]*"[^>]*>([^<]*(?:Coach|Coordinator|Director)[^<]*)<\/(?:div|td|span)>/gi,
      
      // Table format: | Name | Title |
      /\|\s*([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+)\s*\|\s*([^|]*(?:Coach|Coordinator|Director)[^|]*)\s*\|/gi,
      
      // HTML format: <div>Name</div><div>Title with Coach</div>
      /<(?:div|td|span|h\d)[^>]*>([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+)<\/(?:div|td|span|h\d)>\s*<(?:div|td|span)[^>]*>([^<]*(?:Coach|Coordinator|Director)[^<]*)<\/(?:div|td|span)>/gi,
      
      // Link format: <a href="/staff/name">Name</a> - Title
      /<a[^>]*href="[^"]*(?:staff|roster|coaches)[^"]*">([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+)<\/a>\s*[-–]\s*([^<\n]*(?:Coach|Coordinator|Director)[^<\n]*)/gi,
      
      // Simple format: Name - Title or Name, Title
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+)\s*[-–,]\s*([^<\n]*(?:Head\s+Coach|Assistant\s+Coach|Associate.*Coach|Coordinator)[^<\n]*)/gi,
      
      // JSON-LD structured data (common in modern sports sites)
      /"name"\s*:\s*"([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+)"[^}]*"jobTitle"\s*:\s*"([^"]*(?:Coach|Coordinator|Director)[^"]*)"/gi,
    ];
    
    let totalMatches = 0;
    
    for (const pattern of coachPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = this.cleanName(match[1]);
        const title = this.cleanTitle(match[2]);
        
        if (name && title && this.isValidCoach(name, title)) {
          const sport = this.extractSport(match[0], content);
          const email = this.extractEmail(name, content);
          
          // Extract phone number if present
          const phone = this.extractPhone(match[0], content);
          
          console.log(`   🎯 Found match: "${name}" - "${title}" (${sport})`);
          if (email) console.log(`     📧 Email: ${email}`);
          if (phone) console.log(`     📞 Phone: ${phone}`);
          
          coaches.push({
            name,
            title,
            sport,
            email,
            phone,
            confidence: 0.8,
          });
          
          totalMatches++;
          if (totalMatches > 100) break; // Prevent infinite loops
        } else {
          console.log(`   ❌ Invalid match: "${name}" - "${title}"`);
        }
      }
    }
    
    // Remove duplicates
    const uniqueCoaches = coaches.filter((coach, index, self) => 
      index === self.findIndex(c => c.name === coach.name)
    );
    
    console.log(`   📋 Extracted ${uniqueCoaches.length} unique coaches from ${sourceUrl}`);
    return uniqueCoaches;
  }
  
  /**
   * Clean and validate coach names
   */
  private cleanName(name: string): string | null {
    if (!name) return null;
    
    const cleaned = name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.'-]/g, '');
    
    // Validation
    const parts = cleaned.split(' ');
    if (parts.length < 2 || cleaned.length < 4 || cleaned.length > 40) return null;
    if (!/^[A-Z]/.test(cleaned)) return null;
    
    // Reject obvious non-names
    const badWords = /^(Coach|Staff|Department|Athletics|Sports|Performance|Menu|Navigation)$/i;
    if (parts.some(part => badWords.test(part))) return null;
    
    return cleaned;
  }
  
  /**
   * Clean and validate coach titles
   */
  private cleanTitle(title: string): string | null {
    if (!title) return null;
    
    const cleaned = title.trim().replace(/\s+/g, ' ');
    
    // Must contain coaching-related keywords
    if (!/(?:Coach|Coordinator|Director|Assistant|Head|Associate)/i.test(cleaned)) return null;
    
    // Extract core title
    if (/Head.*Coach/i.test(cleaned)) return 'Head Coach';
    if (/Associate.*Head.*Coach/i.test(cleaned)) return 'Associate Head Coach';
    if (/Assistant.*Coach/i.test(cleaned)) return 'Assistant Coach';
    if (/Volunteer.*Coach/i.test(cleaned)) return 'Volunteer Coach';
    if (/Recruiting.*Coordinator/i.test(cleaned)) return 'Recruiting Coordinator';
    if (/Athletics.*Director/i.test(cleaned)) return 'Athletics Director';
    
    return 'Assistant Coach'; // Default
  }
  
  /**
   * Validate if this is likely a coach
   */
  private isValidCoach(name: string, title: string): boolean {
    // Must have reasonable name
    if (!name || name.length < 4 || !/^[A-Z]/.test(name)) return false;
    
    // Must have coaching title
    if (!title || !/(?:Coach|Coordinator|Director)/i.test(title)) return false;
    
    return true;
  }
  
  /**
   * Extract sport from context
   */
  private extractSport(context: string, fullContent: string): string {
    const sportPatterns = {
      'Football': /football/i,
      'Basketball': /basketball/i, 
      'Baseball': /baseball/i,
      'Softball': /softball/i,
      'Soccer': /soccer/i,
      'Tennis': /tennis/i,
      'Golf': /golf/i,
      'Swimming': /swimming/i,
      'Volleyball': /volleyball/i,
      'Track and Field': /track|field/i,
    };
    
    for (const [sport, pattern] of Object.entries(sportPatterns)) {
      if (pattern.test(context)) return sport;
    }
    
    return 'General Athletics';
  }
  
  /**
   * Extract email near a coach's name
   */
  private extractEmail(name: string, content: string): string | undefined {
    const nameIndex = content.toLowerCase().indexOf(name.toLowerCase());
    if (nameIndex === -1) return undefined;
    
    // Look in 500 char window around the name
    const start = Math.max(0, nameIndex - 250);
    const end = Math.min(content.length, nameIndex + name.length + 250);
    const window = content.substring(start, end);
    
    const emailMatch = window.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return emailMatch ? emailMatch[1] : undefined;
  }
  
  /**
   * Extract phone number from context
   */
  private extractPhone(context: string, fullContent?: string): string | undefined {
    // Look for phone numbers in the immediate context first
    const phonePatterns = [
      /(\d{3}-\d{3}-\d{4})/,           // 123-456-7890
      /(\(\d{3}\)\s*\d{3}-\d{4})/,    // (123) 456-7890  
      /(\d{3}\.\d{3}\.\d{4})/,        // 123.456.7890
      /(\d{10})/                       // 1234567890
    ];
    
    for (const pattern of phonePatterns) {
      const match = context.match(pattern);
      if (match) return match[1];
    }
    
    return undefined;
  }
  
  /**
   * Scrape coaches from a school's athletic website
   */
  async scrapeSchool(schoolId: number, schoolName: string, athleticWebsite: string): Promise<SchoolScrapingResult> {
    console.log(`\n🎯 Scraping ${schoolName} with stealth Puppeteer...`);
    
    const startTime = Date.now();
    const urlPatterns = this.getStaffUrlPatterns(athleticWebsite);
    
    // Try each URL pattern until we find coaches
    for (const url of urlPatterns) {
      console.log(`   🔍 Trying: ${url}`);
      
      const result = await this.scraper.scrapeUrl(url, {
        waitFor: 4000,
        timeout: 30000
      });
      
      if (result.success && result.content && result.contentLength > 10000) {
        console.log(`   ✅ Found substantial content (${result.contentLength} chars)`);
        
        const coaches = this.extractCoachesFromContent(result.content, url);
        
        if (coaches.length > 0) {
          const scrapingTime = Date.now() - startTime;
          
          console.log(`   🎉 Successfully extracted ${coaches.length} coaches`);
          
          return {
            school_id: schoolId,
            school_name: schoolName,
            success: true,
            coaches,
            source_url: url,
            scraping_time: scrapingTime
          };
        }
      } else if (result.error) {
        console.log(`   ❌ Failed: ${result.error}`);
      } else {
        console.log(`   ⚠️ Low content: ${result.contentLength} chars`);
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const scrapingTime = Date.now() - startTime;
    
    return {
      school_id: schoolId,
      school_name: schoolName, 
      success: false,
      coaches: [],
      source_url: athleticWebsite,
      scraping_time: scrapingTime,
      error: 'No coaches found in any staff pages'
    };
  }
  
  /**
   * Close the scraper
   */
  async close(): Promise<void> {
    await this.scraper.close();
  }
}

export { AthleticCoachScraper };

// Test if run directly
if (import.meta.main) {
  const scraper = new AthleticCoachScraper();
  
  const test = async () => {
    try {
      // Test on Alabama football specifically 
      const result = await scraper.scrapeSchool(
        8, // Alabama ID from our database
        'University of Alabama',
        'https://rolltide.com/sports/football'
      );
      
      console.log('\n📊 Final Results:');
      console.log(`School: ${result.school_name}`);
      console.log(`Success: ${result.success}`);
      console.log(`Coaches found: ${result.coaches.length}`);
      console.log(`Source URL: ${result.source_url}`);
      console.log(`Scraping time: ${result.scraping_time}ms`);
      
      if (result.coaches.length > 0) {
        console.log('\n👥 Sample coaches:');
        result.coaches.slice(0, 5).forEach(coach => {
          console.log(`  ${coach.name} - ${coach.title} (${coach.sport})`);
          if (coach.email) console.log(`    📧 ${coach.email}`);
        });
      }
      
    } finally {
      await scraper.close();
    }
  };
  
  test();
}