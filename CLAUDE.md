# School Stats Platform - Claude Code Development Guide

## Project Overview

The School Stats Platform is a dedicated data collection and API service that specializes in scraping, processing, and serving comprehensive NCAA athletic program data. This system operates independently from the main NCRA platform and provides data via authenticated API endpoints.

## Essential Development Workflow

### Quick Commands

```bash
# Development
bun dev                      # Start development server
bun build                    # Build for production
bun start                   # Start production server

# Database
bun db:migrate              # Run database migrations
bun db:seed                 # Seed development data
bun db:reset               # Reset database
bun db:gen-types           # Generate TypeScript types

# Data Collection
bun scrape:hybrid          # Run hybrid Firecrawl + Puppeteer scraping
bun scrape:firecrawl       # Run Firecrawl-only scraping
bun scrape:puppeteer       # Run Puppeteer-only scraping
bun monitor:data-quality   # Monitor data quality metrics

# Testing
bun test                   # Run unit tests
bun test:e2e              # Run end-to-end tests
bun lint                  # Run linting
bun typecheck            # Run TypeScript checks
```

## Critical Instructions

### DO NOT:

- Create documentation files (\*.md) unless explicitly requested
- Create new files when you can edit existing ones
- Add comments to code unless specifically asked
- Use npm/yarn - this project uses bun exclusively

### ALWAYS:

- Run `bun lint` and `bun typecheck` after making changes
- Check existing patterns before implementing new features
- Follow the established code style and conventions

## Project Architecture

### Core Purpose

This platform serves as a **specialized data collection engine** for NCAA athletic programs, featuring:

- **Advanced Web Scraping**: Hybrid Firecrawl + Puppeteer system for bypassing anti-bot protections
- **Data Quality Monitoring**: Real-time validation and cleaning of extracted athletic staff data
- **API Service Layer**: Authenticated endpoints for data consumption by external platforms
- **Multi-Source Integration**: Combines official NCAA data with scraped athletic website data

### Tech Stack

- **Runtime**: Bun (package manager, test runner, bundler)
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Web Scraping**: Firecrawl API + Puppeteer with stealth plugins
- **Authentication**: Supabase Auth with API key management
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Deployment**: Vercel with automated scaling

### Database Schema

#### Core Tables

```sql
-- NCAA verified schools with official data
schools_ncaa_verified (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  athletic_website TEXT,
  conference TEXT,
  athletic_division TEXT,
  state TEXT,
  city TEXT,
  mascot TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scraped athletic staff data
athletic_staff (
  id SERIAL PRIMARY KEY,
  ncaa_school_id INTEGER REFERENCES schools_ncaa_verified(id),
  school_id INTEGER, -- nullable for legacy compatibility
  name TEXT NOT NULL,
  title TEXT,
  sport TEXT DEFAULT 'General Athletics',
  email TEXT,
  phone TEXT,
  bio TEXT,
  scraping_method TEXT DEFAULT 'firecrawl',
  confidence_score DECIMAL(3,2) DEFAULT 0.80,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data quality monitoring
scraping_runs (
  id SERIAL PRIMARY KEY,
  method TEXT NOT NULL, -- 'firecrawl', 'puppeteer', 'hybrid'
  schools_processed INTEGER DEFAULT 0,
  coaches_extracted INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  average_scraping_time INTEGER, -- milliseconds
  errors JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- API access control
api_keys (
  id SERIAL PRIMARY KEY,
  key_name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  permissions JSONB DEFAULT '{"read": true, "write": false}',
  rate_limit_per_hour INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);
```

## Scraping System Architecture

### Hybrid Strategy

The platform implements a **sophisticated multi-tier scraping approach**:

```typescript
const scrapingStrategy = {
  tier1: 'firecrawl',      // Small/mid schools (90%+ success rate)
  tier2: 'firecrawl',      // Mid-tier schools (60-70% success rate) 
  tier3: 'puppeteer',      // Major programs blocked by Firecrawl (75%+ success rate)
  fallback: 'hybrid'       // Firecrawl first, Puppeteer if <3 coaches found
};
```

### Anti-Bot Evasion Levels

```typescript
// Protection level detection
const antiBot Levels = {
  basic: ['Villanova', 'smaller D1 schools'],        // 90%+ Firecrawl success
  moderate: ['mid-tier athletic programs'],           // 60-70% Firecrawl success  
  enterprise: ['Alabama', 'UCLA', 'Ohio State'],     // 20-30% Firecrawl, 75%+ Puppeteer
  military: ['premium recruiting platforms']          // <10% any method
};
```

### Key Scraping Components

1. **Firecrawl Integration** (`lib/firecrawl-client.ts`)
   - Primary scraping method for accessible schools
   - Pattern-based extraction with enhanced regex
   - Email and phone number detection
   - Sport classification from page context

2. **Stealth Puppeteer System** (`lib/puppeteer/stealth-scraper.ts`)
   - Advanced anti-detection browser configuration
   - Human-like behavior simulation
   - Bypasses enterprise Cloudflare protection
   - Dynamic content loading for JavaScript-heavy sites

3. **Hybrid Orchestration** (`lib/scraping/hybrid-scraper-system.ts`)
   - Intelligent routing based on school likelihood to be blocked
   - Automatic fallback logic
   - Performance monitoring and reporting
   - Database integration for both methods

## API Endpoints

### Data Access Endpoints

```typescript
// Get all schools with optional filtering
GET /api/schools?conference=SEC&state=Alabama&division=I
Authorization: Bearer {api_key}

// Get athletic staff for specific school
GET /api/schools/{school_id}/staff?sport=football&title=head-coach
Authorization: Bearer {api_key}

// Search coaches across all schools
GET /api/staff/search?name=john&sport=basketball&conference=Big%2010
Authorization: Bearer {api_key}

// Get scraping statistics and data quality metrics
GET /api/metrics/scraping-runs?limit=10
Authorization: Bearer {api_key}
```

### Administrative Endpoints

```typescript
// Trigger scraping run
POST /api/admin/scrape
Authorization: Bearer {admin_api_key}
Content-Type: application/json
{
  "method": "hybrid", // "firecrawl" | "puppeteer" | "hybrid"
  "school_ids": [8, 15, 23], // optional, defaults to all schools
  "force_refresh": true
}

// Data quality monitoring
GET /api/admin/data-quality
Authorization: Bearer {admin_api_key}
```

## Data Quality Standards

### Coach Record Validation

```typescript
interface CoachValidationRules {
  name: {
    minLength: 4,
    maxLength: 40,
    pattern: /^[A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+$/,
    blacklist: ['Coach', 'Staff', 'Department', 'Menu', 'Navigation']
  },
  title: {
    requiredKeywords: ['Coach', 'Coordinator', 'Director'],
    standardizedTitles: {
      'Head Coach': /Head.*Coach/i,
      'Assistant Coach': /Assistant.*Coach/i,
      'Associate Head Coach': /Associate.*Head.*Coach/i
    }
  },
  contact: {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^(\d{3}-\d{3}-\d{4}|\(\d{3}\)\s*\d{3}-\d{4}|\d{10})$/
  },
  confidence: {
    high: 0.9,    // Perfect extraction with validation
    medium: 0.8,  // Good extraction, minor issues
    low: 0.6      // Extraction with data quality concerns
  }
}
```

### Success Metrics

- **Data Coverage**: Target 85%+ of schools with usable coach data
- **Contact Information**: Target 60%+ of coaches with email or phone
- **Name Accuracy**: Target 95%+ clean, properly formatted names
- **Sport Classification**: Target 90%+ correct sport assignment
- **Premier Program Coverage**: Target 80%+ of top 50 athletic programs

## Environment Variables

### Core Application

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:port/school_stats"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Scraping Services
FIRECRAWL_API_KEY="fc-your-api-key"
TOGETHER_API_KEY="your-together-ai-key" # for AI-enhanced extraction

# Security
API_SECRET_KEY="your-secret-for-signing-api-keys"
ADMIN_API_KEY="your-admin-key-for-internal-operations"

# External Integrations (optional)
WEBHOOK_SECRET="secret-for-webhook-verification"
```

## File Structure

```
school-stats/
├── app/                    # Next.js 15 app directory
│   ├── api/               # API routes
│   │   ├── schools/       # School data endpoints
│   │   ├── staff/         # Athletic staff endpoints
│   │   ├── scrape/        # Scraping trigger endpoints
│   │   └── admin/         # Administrative endpoints
│   └── dashboard/         # Optional admin dashboard
├── lib/                   # Core utilities
│   ├── scraping/          # Scraping orchestration
│   ├── firecrawl/         # Firecrawl integration
│   ├── puppeteer/         # Stealth scraper
│   ├── validation/        # Data quality validation
│   └── api/              # API utilities and middleware
├── scripts/               # Data collection scripts
│   ├── scraping/          # Manual scraping scripts
│   ├── data-migration/    # Database migration utilities
│   └── monitoring/        # Data quality monitoring
├── supabase/             # Database schema and migrations
│   ├── migrations/        # SQL migrations
│   └── seed.sql          # Initial data seeding
└── tests/                # Test suites
    ├── scraping/         # Scraping system tests
    ├── api/              # API endpoint tests
    └── data-quality/     # Data validation tests
```

## Development Patterns

### Scraping Orchestration

```typescript
// lib/scraping/orchestrator.ts
interface ScrapingJob {
  id: string;
  method: 'firecrawl' | 'puppeteer' | 'hybrid';
  school_ids: number[];
  priority: 'high' | 'normal' | 'low';
  scheduled_at?: Date;
  max_retries: number;
}

export class ScrapingOrchestrator {
  async scheduleJob(job: ScrapingJob): Promise<string> {
    // Queue job with retry logic and rate limiting
  }
  
  async processJob(jobId: string): Promise<ScrapingResult> {
    // Execute scraping with monitoring and error handling
  }
}
```

### API Authentication Middleware

```typescript
// lib/api/auth-middleware.ts
export async function authenticateApiKey(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  
  if (!apiKey) {
    throw new Error('API key required');
  }
  
  const keyData = await validateApiKey(apiKey);
  if (!keyData.is_active) {
    throw new Error('API key is inactive');
  }
  
  // Rate limiting check
  await enforceRateLimit(keyData.id, keyData.rate_limit_per_hour);
  
  return keyData;
}
```

### Data Quality Monitoring

```typescript
// lib/validation/data-quality-monitor.ts
export class DataQualityMonitor {
  async validateCoachRecord(coach: CoachRecord): Promise<ValidationResult> {
    const issues = [];
    
    // Name validation
    if (!this.isValidName(coach.name)) {
      issues.push({ field: 'name', issue: 'Invalid format', severity: 'high' });
    }
    
    // Contact validation  
    if (coach.email && !this.isValidEmail(coach.email)) {
      issues.push({ field: 'email', issue: 'Invalid format', severity: 'medium' });
    }
    
    return { 
      isValid: issues.filter(i => i.severity === 'high').length === 0,
      issues,
      confidence: this.calculateConfidence(coach, issues)
    };
  }
}
```

## Deployment Strategy

### Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "bun run build",
  "devCommand": "bun dev",
  "installCommand": "bun install",
  "functions": {
    "app/api/scrape/[...slug].ts": {
      "maxDuration": 300
    }
  },
  "crons": [
    {
      "path": "/api/admin/scrape",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

### Environment-Specific Configuration

```typescript
// lib/config/environment.ts
export const config = {
  development: {
    scrapingConcurrency: 1,
    rateLimits: { scraping: 10, api: 100 },
    logLevel: 'debug'
  },
  production: {
    scrapingConcurrency: 3,
    rateLimits: { scraping: 50, api: 1000 },
    logLevel: 'info'
  }
};
```

## Monitoring and Observability

### Key Metrics to Track

- **Scraping Performance**: Success rates, extraction times, error rates
- **Data Quality**: Name accuracy, contact coverage, confidence scores  
- **API Usage**: Request volumes, response times, error rates
- **System Health**: Database performance, queue lengths, memory usage

### Alerting Rules

- Scraping success rate drops below 70%
- Data quality confidence drops below 0.8 average
- API error rate exceeds 5%
- Database connection issues or high latency

## Getting Started

### Initial Setup

```bash
# 1. Clone and setup
git clone <school-stats-repo>
cd school-stats
bun install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Setup database
bun db:migrate
bun db:seed

# 4. Generate types
bun db:gen-types

# 5. Start development
bun dev
```

### First Scraping Run

```bash
# Test scraping system
bun scrape:hybrid --test --schools="University of Alabama,UCLA"

# Monitor data quality
bun monitor:data-quality

# Check API endpoints
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:3000/api/schools?limit=5
```

## Integration with NCRA Platform

The School Stats platform operates independently but provides data to the main NCRA platform via API:

```typescript
// NCRA platform integration
const schoolStatsClient = new SchoolStatsAPI({
  baseUrl: 'https://school-stats.vercel.app',
  apiKey: process.env.SCHOOL_STATS_API_KEY
});

// Fetch coach data for recruiting
const coaches = await schoolStatsClient.searchStaff({
  sport: 'football',
  title: 'head-coach',
  conference: 'SEC'
});
```

## Support & Resources

### Documentation
- **API Documentation**: Auto-generated OpenAPI spec at `/api/docs`
- **Scraping Guide**: `docs/scraping-system.md`
- **Data Quality Standards**: `docs/data-quality.md`

### Key Architecture Files
- **Hybrid Scraper**: `lib/scraping/hybrid-scraper-system.ts`
- **Firecrawl Client**: `lib/firecrawl/scrape-athletic-coaches.ts`
- **Stealth Puppeteer**: `lib/puppeteer/stealth-scraper.ts`
- **API Authentication**: `lib/api/auth-middleware.ts`
- **Data Validation**: `lib/validation/data-quality-monitor.ts`

## Important Notes

- **Independent Operation**: This platform runs separately from NCRA main application
- **API-First Design**: All data access happens through authenticated API endpoints
- **Scalable Architecture**: Designed to handle thousands of schools and hundreds of thousands of staff records
- **Data Quality Focus**: Built-in validation, monitoring, and confidence scoring
- **Compliance Ready**: Respects robots.txt, implements rate limiting, and follows scraping best practices

---

*This platform specializes in high-quality NCAA athletic data collection and serves as the data backbone for recruiting and analytics platforms.*