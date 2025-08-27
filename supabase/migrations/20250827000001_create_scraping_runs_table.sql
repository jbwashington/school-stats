-- Create scraping_runs table for monitoring scraping job performance
create table if not exists public.scraping_runs (
  id bigint primary key generated always as identity,
  method text not null check (method in ('firecrawl', 'puppeteer', 'hybrid')),
  schools_processed int default 0,
  coaches_extracted int default 0,
  success_rate decimal(5,2),
  average_scraping_time int, -- milliseconds
  errors jsonb,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Add RLS policy
alter table public.scraping_runs enable row level security;

create policy "Allow read access to scraping runs"
on public.scraping_runs for select 
using (true);

-- Add indexes
create index if not exists idx_scraping_runs_method on public.scraping_runs(method);
create index if not exists idx_scraping_runs_started_at on public.scraping_runs(started_at desc);
create index if not exists idx_scraping_runs_completed_at on public.scraping_runs(completed_at desc);