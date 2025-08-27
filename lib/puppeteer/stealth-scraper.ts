#!/usr/bin/env bun

/**
 * Stealth Puppeteer Scraper for Anti-Bot Evasion
 * Targets major athletic programs blocked by standard scraping
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';

// Configure stealth plugin
puppeteer.use(StealthPlugin());

interface StealthScrapingResult {
  success: boolean;
  url: string;
  content?: string;
  contentLength: number;
  error?: string;
  scrapingTime: number;
}

class StealthScraper {
  private browser?: Browser;
  
  /**
   * Initialize browser with advanced anti-detection settings
   */
  async initialize(): Promise<void> {
    console.log('🕶️ Initializing stealth browser...');
    
    this.browser = await puppeteer.launch({
      headless: true, // Use headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-background-networking',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--no-first-run',
        '--password-store=basic',
        '--use-mock-keychain',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
      defaultViewport: {
        width: 1366,
        height: 768
      }
    });
    
    console.log('✅ Stealth browser initialized');
  }
  
  /**
   * Configure page with human-like behavior
   */
  private async configurePage(page: Page): Promise<void> {
    // Set realistic viewport and user agent
    await page.setViewport({
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
    });
    
    // Override the user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set additional headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    });
    
    // Override permissions
    const context = this.browser!.defaultBrowserContext();
    await context.overridePermissions('https://example.com', ['geolocation']);
    
    // Add realistic mouse movement
    await page.evaluateOnNewDocument(() => {
      // Override the `plugins` property to use a custom getter
      Object.defineProperty(navigator, 'plugins', {
        get: function() {
          return [1, 2, 3, 4, 5];
        },
      });
    });
  }
  
  /**
   * Scrape a URL with advanced anti-detection
   */
  async scrapeUrl(url: string, options: {
    waitFor?: number;
    timeout?: number;
    retries?: number;
  } = {}): Promise<StealthScrapingResult> {
    
    const { waitFor = 3000, timeout = 30000, retries = 2 } = options;
    const startTime = Date.now();
    
    if (!this.browser) {
      await this.initialize();
    }
    
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      const page = await this.browser!.newPage();
      
      try {
        console.log(`🎯 Attempt ${attempt}: Scraping ${url}`);
        
        await this.configurePage(page);
        
        // Navigate with realistic timing
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: timeout
        });
        
        // Human-like delay
        await this.humanDelay(waitFor);
        
        // Wait for potential dynamic content and JavaScript to load
        await page.waitForFunction(() => {
          return document.readyState === 'complete';
        }, { timeout: 5000 }).catch(() => {
          console.log('   ⚠️ Page may not be fully loaded, continuing...');
        });
        
        // Wait for dynamic content to load (look for common staff/coach elements)
        await Promise.race([
          page.waitForSelector('[class*="staff"], [class*="coach"], [class*="roster"], .sidearm-roster', { timeout: 8000 }).catch(() => null),
          new Promise(resolve => setTimeout(resolve, 8000)) // Fallback timeout
        ]).catch(() => {
          console.log('   ⚠️ Dynamic content may still be loading...');
        });
        
        // Additional delay for heavy JavaScript sites
        await this.humanDelay(2000);
        
        // Extract content
        const content = await page.content();
        const scrapingTime = Date.now() - startTime;
        
        console.log(`   ✅ Successfully scraped ${content.length} characters in ${scrapingTime}ms`);
        
        await page.close();
        
        return {
          success: true,
          url,
          content,
          contentLength: content.length,
          scrapingTime
        };
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.log(`   ❌ Attempt ${attempt} failed: ${lastError}`);
        
        await page.close().catch(() => {});
        
        if (attempt <= retries) {
          // Exponential backoff
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
          console.log(`   ⏱️ Waiting ${delay}ms before retry...`);
          await this.humanDelay(delay);
        }
      }
    }
    
    const scrapingTime = Date.now() - startTime;
    
    return {
      success: false,
      url,
      contentLength: 0,
      error: lastError,
      scrapingTime
    };
  }
  
  /**
   * Human-like delay with random variation
   */
  private async humanDelay(baseDelay: number): Promise<void> {
    const variation = baseDelay * 0.3; // 30% variation
    const delay = baseDelay + (Math.random() * variation - variation / 2);
    await new Promise(resolve => setTimeout(resolve, Math.max(100, delay)));
  }
  
  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

export { StealthScraper };

// Test if run directly
if (import.meta.main) {
  const scraper = new StealthScraper();
  
  const test = async () => {
    try {
      // Test on known blocked site
      const result = await scraper.scrapeUrl('https://rolltide.com/staff', {
        waitFor: 5000,
        timeout: 30000
      });
      
      console.log('\n📊 Test Results:');
      console.log(`Success: ${result.success}`);
      console.log(`Content length: ${result.contentLength}`);
      console.log(`Scraping time: ${result.scrapingTime}ms`);
      
      if (result.content) {
        console.log(`Content preview: ${result.content.substring(0, 200)}...`);
      }
      
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      
    } finally {
      await scraper.close();
    }
  };
  
  test();
}