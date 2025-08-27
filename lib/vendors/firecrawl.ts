// Firecrawl API Client for School Stats Platform

interface FirecrawlResponse {
  success: boolean;
  data?: {
    content: string;
    metadata: {
      title: string;
      description?: string;
      url: string;
    };
  };
  error?: string;
}

interface ScrapeOptions {
  formats?: string[];
  includeTags?: string[];
  excludeTags?: string[];
  onlyMainContent?: boolean;
  waitFor?: number;
}

class FirecrawlClient {
  private apiKey: string;
  private baseUrl = 'https://api.firecrawl.dev/v0';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async scrapeUrl(url: string, options: ScrapeOptions = {}): Promise<FirecrawlResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          url,
          formats: options.formats || ['markdown'],
          includeTags: options.includeTags,
          excludeTags: options.excludeTags,
          onlyMainContent: options.onlyMainContent ?? true,
          waitFor: options.waitFor || 0
        })
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const result = await response.json();
      
      return {
        success: true,
        data: {
          content: result.data?.content || '',
          metadata: {
            title: result.data?.metadata?.title || '',
            description: result.data?.metadata?.description,
            url: result.data?.metadata?.sourceURL || url
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Export singleton instance
export const firecrawlApp = new FirecrawlClient(process.env.FIRECRAWL_API_KEY || '');