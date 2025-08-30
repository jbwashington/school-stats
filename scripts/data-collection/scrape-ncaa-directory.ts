#!/usr/bin/env bun

/**
 * NCAA Directory Scraper
 * Scrapes athletic website URLs from the NCAA member directory
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase/database.types';

puppeteer.use(StealthPlugin());

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NCAAMember {
  name: string;
  conference: string;
  division: string;
  athleticWebsite?: string;
  academicWebsite?: string;
}

async function scrapeNCAADirectory(): Promise<NCAAMember[]> {
  console.log('🏫 Starting NCAA Directory scrape...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📥 Loading NCAA directory page...');
    await page.goto('https://web3.ncaa.org/directory/memberList?type=1', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for the directory content to load
    console.log('⏳ Waiting for content to load...');
    
    try {
      // Wait for either the member list table or any content that indicates the page has loaded
      await page.waitForSelector('table, .member-list, .directory-content, [data-testid="member-list"]', { 
        timeout: 15000 
      });
    } catch (error) {
      console.log('⚠️ Standard selectors not found, trying alternative approach...');
    }

    // Get page content and look for school data
    const pageContent = await page.content();
    console.log(`📄 Page content length: ${pageContent.length} characters`);

    // Try to extract data using various methods
    const members = await page.evaluate(() => {
      const results: NCAAMember[] = [];
      
      // Method 1: Look for table rows
      const tableRows = document.querySelectorAll('table tr, .table-row, .member-row');
      console.log(`Found ${tableRows.length} potential table rows`);
      
      tableRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td, .cell, .member-cell');
        if (cells.length >= 3) {
          const name = cells[0]?.textContent?.trim() || '';
          const conference = cells[1]?.textContent?.trim() || '';
          const division = cells[2]?.textContent?.trim() || '';
          
          // Look for website links in the row
          const links = row.querySelectorAll('a[href]');
          let athleticWebsite = '';
          let academicWebsite = '';
          
          links.forEach(link => {
            const href = link.getAttribute('href') || '';
            const text = link.textContent?.toLowerCase() || '';
            
            if (text.includes('athletics') || text.includes('sports') || href.includes('athletics')) {
              athleticWebsite = href;
            } else if (text.includes('academic') || text.includes('university') || text.includes('college')) {
              academicWebsite = href;
            }
          });
          
          if (name && conference && division) {
            results.push({
              name,
              conference,
              division,
              athleticWebsite,
              academicWebsite
            });
          }
        }
      });
      
      // Method 2: Look for JSON data in script tags
      const scriptTags = document.querySelectorAll('script');
      scriptTags.forEach(script => {
        const content = script.textContent || '';
        if (content.includes('memberList') || content.includes('directory') || content.includes('schools')) {
          try {
            // Try to extract JSON data
            const jsonMatches = content.match(/\{.*\}/g);
            jsonMatches?.forEach(jsonStr => {
              try {
                const data = JSON.parse(jsonStr);
                if (data.members || data.schools || Array.isArray(data)) {
                  console.log('Found potential JSON data structure');
                }
              } catch (e) {
                // Ignore invalid JSON
              }
            });
          } catch (error) {
            // Ignore parsing errors
          }
        }
      });
      
      return results;
    });

    console.log(`📊 Extracted ${members.length} NCAA members from directory`);
    
    if (members.length === 0) {
      // If no data found, save page content for debugging
      const debugContent = await page.content();
      console.log('🔍 No members found. Saving page content for debugging...');
      
      // Save a sample of the page content
      const sampleContent = debugContent.slice(0, 5000);
      console.log('📄 Page content sample:', sampleContent);
    }

    return members;
    
  } catch (error) {
    console.error('❌ Error scraping NCAA directory:', error);
    return [];
  } finally {
    await browser.close();
  }
}

async function updateSchoolWebsites(members: NCAAMember[]) {
  console.log('🔄 Updating school athletic websites in database...');
  
  let updatedCount = 0;
  let matchedCount = 0;
  
  for (const member of members) {
    if (!member.athleticWebsite) continue;
    
    // Try to find matching school by name
    const { data: schools, error } = await supabase
      .from('schools_ncaa_verified')
      .select('id, name')
      .ilike('name', `%${member.name}%`)
      .limit(5);
      
    if (error) {
      console.error(`❌ Error finding school ${member.name}:`, error);
      continue;
    }
    
    if (schools && schools.length > 0) {
      matchedCount++;
      
      // Update the first matching school
      const schoolId = schools[0].id;
      const { error: updateError } = await supabase
        .from('schools_ncaa_verified')
        .update({ 
          athletic_website: member.athleticWebsite,
          updated_at: new Date().toISOString()
        })
        .eq('id', schoolId);
        
      if (updateError) {
        console.error(`❌ Error updating ${member.name}:`, updateError);
      } else {
        updatedCount++;
        console.log(`✅ Updated ${member.name} -> ${member.athleticWebsite}`);
      }
    } else {
      console.log(`⚠️ No match found for: ${member.name}`);
    }
  }
  
  console.log(`\n📊 Update Summary:`);
  console.log(`   - Members scraped: ${members.length}`);
  console.log(`   - Schools matched: ${matchedCount}`);
  console.log(`   - Websites updated: ${updatedCount}`);
  
  return { scraped: members.length, matched: matchedCount, updated: updatedCount };
}

async function main() {
  try {
    console.log('🚀 NCAA Directory Athletic Website Scraper');
    console.log('=' .repeat(50));
    
    const members = await scrapeNCAADirectory();
    
    if (members.length === 0) {
      console.log('❌ No members extracted from NCAA directory');
      console.log('🔧 This may be due to:');
      console.log('   - Dynamic content loading (JavaScript-heavy page)');
      console.log('   - Anti-scraping protection');
      console.log('   - Changed page structure');
      console.log('   - Network issues');
      
      process.exit(1);
    }
    
    console.log(`\n📋 Sample of extracted members:`);
    members.slice(0, 5).forEach((member, i) => {
      console.log(`${i + 1}. ${member.name} (${member.conference}) - ${member.athleticWebsite || 'No website'}`);
    });
    
    const results = await updateSchoolWebsites(members);
    
    console.log('\n✅ NCAA directory scraping completed successfully!');
    console.log(`📊 Final stats: ${results.scraped} scraped, ${results.updated} updated`);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { scrapeNCAADirectory, updateSchoolWebsites };