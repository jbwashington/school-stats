-- Create api_keys table for API authentication and rate limiting
create table if not exists public.api_keys (
  id bigint primary key generated always as identity,
  key_name text not null,
  key_hash text not null unique,
  permissions jsonb default '{"read": true, "write": false, "admin": false}'::jsonb,
  rate_limit_per_hour int default 1000,
  created_at timestamptz default now(),
  last_used_at timestamptz,
  is_active boolean default true
);

-- Add RLS policy (restrict access to service role only)
alter table public.api_keys enable row level security;

create policy "Service role only access to api_keys"
on public.api_keys for all
using (auth.role() = 'service_role');

-- Add indexes
create index if not exists idx_api_keys_hash on public.api_keys(key_hash);
create index if not exists idx_api_keys_active on public.api_keys(is_active) where is_active = true;
create index if not exists idx_api_keys_last_used on public.api_keys(last_used_at desc);

-- Insert a sample API key for testing (key: school_stats_test_key_12345678901234567890)
insert into public.api_keys (key_name, key_hash, permissions, rate_limit_per_hour)
values (
  'Test API Key',
  encode(sha256('school_stats_test_key_12345678901234567890'::bytea), 'base64'),
  '{"read": true, "write": false, "admin": false}'::jsonb,
  1000
) on conflict (key_hash) do nothing;

-- Insert admin API key (key: school_stats_admin_key_98765432109876543210)
insert into public.api_keys (key_name, key_hash, permissions, rate_limit_per_hour)
values (
  'Admin API Key',
  encode(sha256('school_stats_admin_key_98765432109876543210'::bytea), 'base64'),
  '{"read": true, "write": true, "admin": true}'::jsonb,
  5000
) on conflict (key_hash) do nothing;