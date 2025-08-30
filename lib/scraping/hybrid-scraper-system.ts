#!/usr/bin/env bun

/**
 * Hybrid Scraping System - Firecrawl + DIY Puppeteer
 * Falls back to stealth scraper for schools blocked by Firecrawl
 */

import { AthleticCoachScraper } from '../puppeteer/athletic-coach-scraper';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

interface HybridScrapingResult {
  school_id: number;
  school_name: string;
  method: 'firecrawl' | 'puppeteer';
  success: boolean;
  coaches: Array<{
    name: string;
    title?: string;
    sport?: string;
    email?: string;
    phone?: string;
    bio?: string;
    confidence_score?: number;
  }>;
  source_url: string;
  scraping_time: number;
  error?: string;
}

export class HybridScraperSystem {
  private puppeteerScraper: AthleticCoachScraper;
  
  constructor() {
    this.puppeteerScraper = new AthleticCoachScraper();
  }
  
  /**
   * Identifies if a school is likely blocked by Firecrawl
   */
  private isLikelyBlocked(schoolName: string): boolean {
    const blockedKeywords = [
      'Alabama',
      'UCLA', 
      'Georgia',
      'Ohio State',
      'Michigan',
      'Texas',
      'Florida',
      'Auburn',
      'LSU',
      'Tennessee'
    ];
    
    return blockedKeywords.some(keyword => 
      schoolName.toLowerCase().includes(keyword.toLowerCase())
    );
  }
  
  /**
   * Try Firecrawl first, then fall back to Puppeteer
   */
  async scrapeSchoolWithFallback(
    schoolId: number, 
    schoolName: string, 
    athleticWebsite: string
  ): Promise<HybridScrapingResult> {
    
    console.log(`\n🎯 Hybrid scraping: ${schoolName}`);
    
    // Check if school is likely blocked - go straight to Puppeteer
    if (this.isLikelyBlocked(schoolName)) {
      console.log(`   ⚡ School likely blocked by Firecrawl, using Puppeteer directly`);
      return this.scrapeWithPuppeteer(schoolId, schoolName, athleticWebsite);
    }
    
    // Try Firecrawl first
    console.log(`   🌐 Attempting Firecrawl...`);
    const firecrawlResult = await this.scrapeWithFirecrawl(schoolId, schoolName, athleticWebsite);
    
    // If Firecrawl succeeds with good data, return it
    if (firecrawlResult.success && firecrawlResult.coaches.length >= 3) {
      console.log(`   ✅ Firecrawl successful with ${firecrawlResult.coaches.length} coaches`);
      return firecrawlResult;
    }
    
    // Firecrawl failed or low coach count, try Puppeteer
    console.log(`   ⚡ Firecrawl insufficient (${firecrawlResult.coaches.length} coaches), trying Puppeteer...`);
    return this.scrapeWithPuppeteer(schoolId, schoolName, athleticWebsite);
  }
  
  /**
   * Scrape using existing Firecrawl system
   */
  private async scrapeWithFirecrawl(
    schoolId: number,
    schoolName: string, 
    athleticWebsite: string
  ): Promise<HybridScrapingResult> {
    
    const startTime = Date.now();
    
    try {
      // Import and run existing Firecrawl scraper
      const { scrapeAthleticCoaches } = await import('../firecrawl/scrape-athletic-coaches');
      
      // Run on just this school
      await scrapeAthleticCoaches([schoolId]);
      
      const scrapingTime = Date.now() - startTime;
      
      // Check database for results
      const supabase = createServiceRoleClient();
      const { data: coaches } = await supabase
        .from('athletic_staff')
        .select('*')
        .eq('ncaa_school_id', schoolId)
        .eq('scraping_method', 'firecrawl');
      
      return {
        school_id: schoolId,
        school_name: schoolName,
        method: 'firecrawl',
        success: (coaches?.length || 0) > 0,
        coaches: coaches?.map(coach => ({
          name: coach.name,
          title: coach.title || undefined,
          sport: coach.sport || undefined,
          email: coach.email || undefined,
          phone: coach.phone || undefined,
          bio: coach.bio || undefined,
          confidence_score: coach.confidence_score || undefined
        })) || [],
        source_url: athleticWebsite,
        scraping_time: scrapingTime,
        error: (coaches?.length || 0) === 0 ? 'No coaches extracted' : undefined
      };
      
    } catch (error) {
      const scrapingTime = Date.now() - startTime;
      
      return {
        school_id: schoolId,
        school_name: schoolName,
        method: 'firecrawl',
        success: false,
        coaches: [],
        source_url: athleticWebsite,
        scraping_time: scrapingTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Scrape using Puppeteer stealth scraper
   */
  private async scrapeWithPuppeteer(
    schoolId: number,
    schoolName: string,
    athleticWebsite: string
  ): Promise<HybridScrapingResult> {
    
    const result = await this.puppeteerScraper.scrapeSchool(schoolId, schoolName, athleticWebsite);
    
    return {
      school_id: result.school_id,
      school_name: result.school_name,
      method: 'puppeteer',
      success: result.success,
      coaches: result.coaches,
      source_url: result.source_url,
      scraping_time: result.scraping_time,
      error: result.error
    };
  }
  
  /**
   * Run hybrid scraping on all schools in database
   */
  async scrapeAllSchools(): Promise<void> {
    const supabase = createServiceRoleClient();
    
    console.log('🚀 Starting hybrid scraping system...\n');
    
    // Get all schools
    const { data: schools } = await supabase
      .from('schools_ncaa_verified')
      .select('id, name, athletic_website')
      .not('athletic_website', 'is', null)
      .order('name');
      
    if (!schools) {
      console.log('❌ No schools found');
      return;
    }
    
    console.log(`📊 Processing ${schools.length} schools with hybrid approach\n`);
    
    let firecrawlCount = 0;
    let puppeteerCount = 0;
    let totalCoaches = 0;
    
    for (const school of schools) {
      if (!school.athletic_website) {
        console.log(`   ⚠️  Skipping ${school.name}: No athletic website`);
        continue;
      }
      
      const result = await this.scrapeSchoolWithFallback(
        school.id,
        school.name,
        school.athletic_website
      );
      
      if (result.success) {
        console.log(`   ✅ Success via ${result.method}: ${result.coaches.length} coaches`);
        totalCoaches += result.coaches.length;
        
        if (result.method === 'firecrawl') firecrawlCount++;
        else puppeteerCount++;
        
        // Save Puppeteer results to database
        if (result.method === 'puppeteer' && result.coaches.length > 0) {
          await this.savePuppeteerResults(result);
        }
        
      } else {
        console.log(`   ❌ Failed via ${result.method}: ${result.error}`);
      }
      
      // Delay between schools to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n📈 Hybrid Scraping Summary:');
    console.log(`Total schools: ${schools.length}`);
    console.log(`Firecrawl successes: ${firecrawlCount}`);
    console.log(`Puppeteer successes: ${puppeteerCount}`);
    console.log(`Total coaches extracted: ${totalCoaches}`);
    console.log(`Overall success rate: ${((firecrawlCount + puppeteerCount) / schools.length * 100).toFixed(1)}%`);
  }
  
  /**
   * Save Puppeteer results to database
   */
  private async savePuppeteerResults(result: HybridScrapingResult): Promise<void> {
    const supabase = createServiceRoleClient();
    
    for (const coach of result.coaches) {
      try {
        const { error } = await supabase
          .from('athletic_staff')
          .insert({
            ncaa_school_id: result.school_id,
            name: coach.name,
            title: coach.title,
            sport: coach.sport,
            email: coach.email,
            phone: coach.phone,
            scraping_method: 'puppeteer'
          });
          
        if (error) {
          console.log(`     ⚠️ Error saving ${coach.name}: ${error.message}`);
        }
      } catch (err) {
        console.log(`     ❌ Failed to save ${coach.name}: ${err}`);
      }
    }
  }
  
  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    await this.puppeteerScraper.close();
  }
}

// Run if executed directly
if (import.meta.main) {
  (async () => {
    const hybridScraper = new HybridScraperSystem();
    
    try {
      // Test on specific schools first
      console.log('🧪 Testing hybrid system on specific schools...\n');
    
    // Test Alabama (should use Puppeteer)
    const alabamaResult = await hybridScraper.scrapeSchoolWithFallback(
      8,
      'University of Alabama', 
      'https://rolltide.com'
    );
    
    console.log('\n📊 Alabama Test Result:');
    console.log(`Method: ${alabamaResult.method}`);
    console.log(`Success: ${alabamaResult.success}`);
    console.log(`Coaches: ${alabamaResult.coaches.length}`);
    console.log(`Time: ${alabamaResult.scraping_time}ms`);
    
    if (alabamaResult.success && alabamaResult.coaches.length > 0) {
      console.log('\n👥 Sample coaches:');
      alabamaResult.coaches.slice(0, 3).forEach(coach => {
        console.log(`  ${coach.name} - ${coach.title} (${coach.sport})`);
        if (coach.phone) console.log(`    📞 ${coach.phone}`);
      });
    }
    
    } finally {
      await hybridScraper.close();
    }
  })();
}