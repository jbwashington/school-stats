# School Stats Platform

A dedicated data collection and API service for comprehensive NCAA athletic program data. This platform specializes in scraping, processing, and serving athletic staff data via authenticated API endpoints.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Git](https://git-scm.com/)

### Initial Setup

```bash
# 1. Clone the repository
git clone <your-school-stats-repo>
cd school-stats

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your actual values

# 4. Start Supabase locally
supabase start

# 5. Run database migrations
bun db:migrate

# 6. Generate TypeScript types
bun db:gen-types

# 7. Start development server
bun dev
```

### Environment Configuration

Edit `.env.local` with your Supabase and API keys:

```bash
# Get these from: supabase status
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-from-supabase-status"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-from-supabase-status"

# Get API keys from respective services
FIRECRAWL_API_KEY="fc-your-firecrawl-api-key"
TOGETHER_API_KEY="your-together-ai-key"

# Generate secure random strings
API_SECRET_KEY="your-32-character-secret-key"
ADMIN_API_KEY="your-admin-api-key"
```

## API Usage

### Authentication

All API endpoints require authentication via API key in the Authorization header:

```bash
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:3000/api/schools
```

### Test API Keys

The system includes pre-configured test keys:

- **Read-only**: `school_stats_test_key_12345678901234567890`
- **Admin**: `school_stats_admin_key_98765432109876543210`

### Core Endpoints

#### Get Schools
```bash
# Get all schools
curl -H "Authorization: Bearer school_stats_test_key_12345678901234567890" \
  "http://localhost:3000/api/schools"

# Filter by conference and state
curl -H "Authorization: Bearer school_stats_test_key_12345678901234567890" \
  "http://localhost:3000/api/schools?conference=SEC&state=Alabama"
```

#### Get Athletic Staff
```bash
# Get staff for a specific school
curl -H "Authorization: Bearer school_stats_test_key_12345678901234567890" \
  "http://localhost:3000/api/schools/8/staff"

# Filter by sport and title
curl -H "Authorization: Bearer school_stats_test_key_12345678901234567890" \
  "http://localhost:3000/api/schools/8/staff?sport=Football&title=head-coach"
```

#### Search Staff Across Schools
```bash
# Search for coaches by name and sport
curl -H "Authorization: Bearer school_stats_test_key_12345678901234567890" \
  "http://localhost:3000/api/staff/search?name=john&sport=basketball"
```

#### Trigger Scraping (Admin Only)
```bash
# Start hybrid scraping job
curl -X POST \
  -H "Authorization: Bearer school_stats_admin_key_98765432109876543210" \
  -H "Content-Type: application/json" \
  -d '{"method": "hybrid", "school_ids": [8, 15, 23]}' \
  http://localhost:3000/api/admin/scrape
```

## Data Collection

### Datasets

The platform includes comprehensive NCAA and sports datasets:

#### NCAA Official Data (9 CSV files, ~500KB total)
- **Complete NCAA Schools**: Full directory of NCAA institutions with verified data
- **Conference Affiliations**: Official conference mappings and divisions
- **Athletic Websites**: Verified URLs for scraping target identification

#### Sports Reference Data (3 CSV files, ~78KB total)  
- **Sports Classifications**: Standardized sport names and categories
- **Performance Metrics**: Available statistics per sport for data integration
- **MaxPreps Integration**: Sport coverage and recruitment priority mapping

```bash
# Process raw datasets into database
bun process:ncaa-data

# Validate dataset quality and completeness
bun validate:datasets

# View dataset documentation
cat datasets/README.md
```

### Scraping Methods

The platform supports three scraping approaches:

1. **Firecrawl** - Fast, works well for accessible sites
2. **Puppeteer** - Advanced anti-bot evasion for blocked sites  
3. **Hybrid** - Automatically chooses best method per school

### Manual Scraping

```bash
# Run hybrid scraping on all schools
bun scrape:hybrid

# Run specific method
bun scrape:firecrawl
bun scrape:puppeteer

# Add new schools to database
bun migrate:schools

# Monitor data quality
bun monitor:data-quality
```

### Scraping Performance

- **Small/Mid Schools**: 90%+ success with Firecrawl
- **Major Programs**: 75%+ success with Puppeteer (Alabama, UCLA, etc.)
- **Overall Hybrid**: ~87% expected success rate

## Development

### Available Scripts

```bash
# Development
bun dev              # Start dev server
bun build            # Build for production
bun start            # Start production server

# Database
bun db:migrate       # Run migrations
bun db:seed          # Seed test data
bun db:reset         # Reset database
bun db:gen-types     # Generate TypeScript types

# Data Collection
bun scrape:hybrid    # Hybrid scraping
bun scrape:firecrawl # Firecrawl only
bun scrape:puppeteer # Puppeteer only

# Dataset Management
bun process:ncaa-data        # Process NCAA CSV files
bun validate:datasets        # Validate dataset quality
bun migrate:schools          # Add major NCAA schools

# Monitoring
bun monitor:data-quality        # Data quality check
bun analyze:blocked-schools     # Identify blocked schools

# Testing
bun test             # Run unit tests
bun test:e2e         # Run E2E tests
bun lint             # Lint code
bun typecheck        # TypeScript check
```

### Project Structure

```
school-stats/
├── app/
│   ├── api/                 # API endpoints
│   │   ├── schools/         # School data APIs
│   │   ├── staff/           # Staff search APIs
│   │   ├── scrape/          # Scraping triggers
│   │   └── admin/           # Admin operations
│   └── dashboard/           # Optional admin dashboard
├── lib/
│   ├── scraping/            # Scraping orchestration
│   ├── firecrawl/           # Firecrawl integration
│   ├── puppeteer/           # Stealth scraping
│   ├── validation/          # Data quality validation
│   ├── api/                 # API utilities
│   └── supabase/            # Database client
├── scripts/
│   ├── scraping/            # Manual scraping scripts
│   ├── data-migration/      # Data import scripts
│   └── monitoring/          # Quality monitoring
├── datasets/                # CSV datasets and documentation
│   ├── raw/                 # Original NCAA and sports data
│   ├── processed/           # Cleaned datasets and reports
│   └── README.md            # Dataset documentation
└── supabase/
    ├── migrations/          # Database schema
    └── tests/               # Database tests
```

## Production Deployment

### Supabase Setup

1. Create new Supabase project
2. Copy connection details to `.env.production`
3. Run migrations: `supabase db push --db-url="your-prod-db-url"`

### Vercel Deployment

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Environment Variables

```bash
# Production Database
DATABASE_URL="postgresql://user:pass@host:port/school_stats"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-prod-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-prod-service-role-key"

# External APIs
FIRECRAWL_API_KEY="fc-your-production-key"
TOGETHER_API_KEY="your-production-key"

# Security
API_SECRET_KEY="your-secure-32-char-secret"
ADMIN_API_KEY="your-secure-admin-key"
```

## API Documentation

### Response Format

All endpoints return consistent JSON responses:

```json
{
  "success": true,
  "data": [...],
  "message": "Optional message",
  "metadata": {
    "timestamp": "2025-08-27T00:00:00.000Z",
    "pagination": {...},
    "statistics": {...}
  }
}
```

### Error Handling

Error responses include helpful details:

```json
{
  "success": false,
  "error": "Descriptive error message",
  "metadata": {
    "timestamp": "2025-08-27T00:00:00.000Z"
  }
}
```

### Rate Limiting

- Default: 1000 requests/hour per API key
- Admin keys: 5000 requests/hour
- Rate limit headers included in responses

## Data Quality

### Coach Record Standards

- **Names**: Properly formatted (John Smith, not "john smith")
- **Titles**: Standardized (Head Coach, Assistant Coach, etc.)
- **Contact Info**: Valid email/phone formats when available
- **Confidence Scores**: 0.6-1.0 based on extraction quality

### Monitoring

The platform tracks:
- Scraping success rates by method and school
- Data quality metrics and confidence scores
- API usage patterns and performance
- Contact information coverage rates

## Support

### Common Issues

1. **API Key Invalid**: Check key format and permissions
2. **Rate Limited**: Wait for rate limit window to reset
3. **School Not Found**: Verify school ID exists in database
4. **Scraping Failed**: Check school website accessibility

### Debugging

```bash
# Check API key status
curl -H "Authorization: Bearer your-key" \
  http://localhost:3000/api/admin/scrape

# View recent scraping runs
curl -H "Authorization: Bearer your-admin-key" \
  http://localhost:3000/api/admin/scrape?limit=5

# Test individual school scraping
bun lib/scraping/hybrid-scraper-system.ts
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Create Pull Request

## License

Private - NCRA Platform Internal Use Only