#!/usr/bin/env bun

/**
 * Enhanced NCAA Directory Scraper
 * Uses multiple strategies to extract comprehensive athletic website data
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
  state?: string;
}

async function scrapeNCAADirectoryEnhanced(): Promise<NCAAMember[]> {
  console.log('🏫 Starting Enhanced NCAA Directory scrape...');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📥 Loading NCAA directory page...');
    await page.goto('https://web3.ncaa.org/directory/memberList?type=1', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Wait for content and try to interact with any filters
    console.log('⏳ Waiting for interactive content...');
    await page.waitForTimeout(5000);
    
    // Try to expand or show all results
    try {
      // Look for pagination or "show more" buttons
      const showAllButton = await page.$('button[aria-label*="show"], button[aria-label*="all"], .pagination button, .show-more');
      if (showAllButton) {
        console.log('🔽 Found show more button, clicking...');
        await showAllButton.click();
        await page.waitForTimeout(3000);
      }
    } catch (error) {
      console.log('ℹ️ No pagination controls found');
    }

    // Enhanced data extraction
    const members = await page.evaluate(() => {
      const results: NCAAMember[] = [];
      
      // Method 1: Advanced table parsing
      const tables = document.querySelectorAll('table, [role="table"], .data-table, .member-table');
      console.log(`Found ${tables.length} potential tables`);
      
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr, [role="row"], .table-row');
        console.log(`  Table has ${rows.length} rows`);
        
        rows.forEach((row, index) => {
          const cells = row.querySelectorAll('td, th, [role="cell"], [role="columnheader"], .cell');
          
          if (cells.length >= 2) {
            const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim() || '');
            
            // Skip header rows
            if (cellTexts.some(text => text.toLowerCase().includes('school') || text.toLowerCase().includes('institution'))) {
              return;
            }
            
            let name = '';
            let conference = '';
            let division = '';
            let state = '';
            let athleticWebsite = '';
            
            // Try different column configurations
            if (cellTexts.length >= 4) {
              name = cellTexts[0];
              conference = cellTexts[1];
              division = cellTexts[2];
              state = cellTexts[3];
            } else if (cellTexts.length === 3) {
              name = cellTexts[0];
              conference = cellTexts[1];
              division = cellTexts[2];
            }
            
            // Look for links within the row
            const links = row.querySelectorAll('a[href]');
            links.forEach(link => {
              const href = link.getAttribute('href') || '';
              const linkText = link.textContent?.toLowerCase() || '';
              
              // Identify athletic websites
              if (href && (
                linkText.includes('athletics') || 
                linkText.includes('sports') || 
                href.includes('athletics') ||
                href.includes('sports') ||
                href.includes('goduke') ||
                href.includes('gohuskies') ||
                href.includes('goheels')
              )) {
                athleticWebsite = href.startsWith('http') ? href : `https://${href}`;
              }
            });
            
            if (name && name.length > 3 && !name.toLowerCase().includes('school name')) {
              results.push({
                name,
                conference,
                division,
                athleticWebsite,
                state
              });
            }
          }
        });
      });
      
      // Method 2: Look for structured data in JavaScript variables
      const scripts = document.querySelectorAll('script:not([src])');
      scripts.forEach(script => {
        const content = script.textContent || '';
        
        // Look for data arrays or objects
        const dataMatches = content.match(/(?:memberList|schools|institutions|directory)\s*[:=]\s*\[[\s\S]*?\]/gi);
        dataMatches?.forEach(match => {
          try {
            const cleanMatch = match.replace(/^[^[]*/, '');
            const data = JSON.parse(cleanMatch);
            
            if (Array.isArray(data)) {
              data.forEach((item: any) => {
                if (item.name || item.schoolName || item.institution) {
                  results.push({
                    name: item.name || item.schoolName || item.institution,
                    conference: item.conference || item.conf || '',
                    division: item.division || item.div || '',
                    athleticWebsite: item.athleticsUrl || item.sportsUrl || item.website || '',
                    state: item.state || ''
                  });
                }
              });
            }
          } catch (e) {
            // Ignore parsing errors
          }
        });
      });
      
      // Method 3: Look for list items or card components
      const listItems = document.querySelectorAll('.member-item, .school-item, .institution-item, [data-school], [data-member]');
      console.log(`Found ${listItems.length} potential list items`);
      
      listItems.forEach(item => {
        const nameEl = item.querySelector('.name, .school-name, .title, h2, h3, h4');
        const confEl = item.querySelector('.conference, .conf, .league');
        const divEl = item.querySelector('.division, .div, .level');
        const linkEl = item.querySelector('a[href*="athletics"], a[href*="sports"]');
        
        if (nameEl?.textContent?.trim()) {
          results.push({
            name: nameEl.textContent.trim(),
            conference: confEl?.textContent?.trim() || '',
            division: divEl?.textContent?.trim() || '',
            athleticWebsite: linkEl?.getAttribute('href') || ''
          });
        }
      });
      
      // Deduplicate results
      const uniqueResults = results.filter((member, index, self) => 
        index === self.findIndex(m => m.name === member.name)
      );
      
      console.log(`Extracted ${uniqueResults.length} unique members`);
      return uniqueResults;
    });

    console.log(`📊 Total extracted: ${members.length} NCAA members`);
    
    // Log some samples for debugging
    console.log('\n📋 Sample extracted data:');
    members.slice(0, 10).forEach((member, i) => {
      console.log(`${i + 1}. ${member.name}`);
      console.log(`   Conference: ${member.conference || 'N/A'}`);
      console.log(`   Division: ${member.division || 'N/A'}`);
      console.log(`   Website: ${member.athleticWebsite || 'N/A'}`);
      console.log('');
    });

    return members;
    
  } catch (error) {
    console.error('❌ Error in enhanced NCAA directory scrape:', error);
    return [];
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    console.log('🚀 Enhanced NCAA Directory Athletic Website Scraper');
    console.log('=' .repeat(60));
    
    const members = await scrapeNCAADirectoryEnhanced();
    
    if (members.length === 0) {
      console.log('❌ No members extracted. The NCAA directory may be:');
      console.log('   - Heavily JavaScript-dependent');
      console.log('   - Protected by anti-scraping measures');
      console.log('   - Using a different structure than expected');
      return;
    }
    
    console.log(`\n✅ Successfully extracted ${members.length} NCAA members`);
    
    // Update database with websites
    let updatedCount = 0;
    for (const member of members) {
      if (member.athleticWebsite) {
        const { data: schools } = await supabase
          .from('schools_ncaa_verified')
          .select('id, name')
          .ilike('name', `%${member.name}%`)
          .limit(1);
          
        if (schools && schools.length > 0) {
          const { error } = await supabase
            .from('schools_ncaa_verified')
            .update({ 
              athletic_website: member.athleticWebsite,
              updated_at: new Date().toISOString()
            })
            .eq('id', schools[0].id);
            
          if (!error) {
            updatedCount++;
            console.log(`✅ Updated ${member.name}: ${member.athleticWebsite}`);
          }
        }
      }
    }
    
    console.log(`\n📊 Final Results:`);
    console.log(`   - Members scraped: ${members.length}`);
    console.log(`   - Athletic websites updated: ${updatedCount}`);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { scrapeNCAADirectoryEnhanced };