-- ============================================================================
-- Migration: Email Messaging Schema for Athletic Faculty
-- Purpose:   Enable sending, tracking, and threading of emails to athletic
--            faculty, including Resend API integration, event tracking,
--            conversation grouping, and user notifications.
-- Affected:  email_conversations, email_messages, email_events, unsubscribes
-- Author:    AI Generated (2025-05-07)
-- ============================================================================

-- 1. email_conversations: Groups threaded messages between users/faculty
create table email_conversations (
    id uuid primary key default uuid_generate_v4(),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    subject text not null,
    user_id uuid not null references profiles(id),
    athletic_staff_id int not null references athletic_staff(id)
);
comment on table public.email_conversations is
  'Groups threaded email messages between users and athletic faculty.';
-- 2. email_messages: Individual messages in a conversation
create table email_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.email_conversations(id) on delete cascade,
  sender_id uuid references auth.users(id),
  recipient_id int references public.athletic_staff(id),
  resend_email_id text, -- ID from Resend API
  subject text not null,
  body text not null,
  status text not null default 'pending', -- sent, delivered, opened, clicked, bounced, etc.
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_messages_subject_check check (char_length(subject) > 0)
);
comment on table public.email_messages is
  'Stores each email sent, including Resend API ID, status, and links to conversation.';
-- 3. email_events: Tracks all webhook events from Resend for each email
create table email_events (
    id uuid primary key default uuid_generate_v4(),
    created_at timestamp with time zone default now(),
    email_message_id uuid not null references public.email_messages(id) on delete cascade,
    event_type text not null, -- sent, delivered, opened, clicked, bounced, unsubscribed, etc.
    event_data jsonb,         -- Raw event payload for extensibility
    constraint email_events_event_type_check check (event_type in ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'))
);
comment on table public.email_events is
  'Tracks all webhook events from Resend for each email.';
-- 4. unsubscribes: Tracks user opt-outs from email notifications
create table unsubscribes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id),
    staff_id int references public.athletic_staff(id),
    unsubscribed_at timestamp with time zone default now(),
    email text not null,
    reason text
);
comment on table public.unsubscribes is
  'Tracks user opt-outs from email notifications.';
-- 5. Indexes for performance
create index if not exists idx_email_messages_conversation_id on public.email_messages(conversation_id);
create index if not exists idx_email_events_email_message_id on public.email_events(email_message_id);
create index if not exists idx_unsubscribes_user_id on public.unsubscribes(user_id);
create index if not exists idx_email_conversations_user_id on public.email_conversations(user_id);
create index if not exists idx_email_conversations_athletic_staff_id on public.email_conversations(athletic_staff_id);
-- 6. Enable Row Level Security (RLS) on all tables
alter table public.email_conversations enable row level security;
alter table public.email_messages enable row level security;
alter table public.email_events enable row level security;
alter table public.unsubscribes enable row level security;
-- 7. RLS Policies (example: allow only sender/recipient to view their messages)
-- You should further customize these policies for your app's needs.

-- ---------------------------------------------------------------------------
-- RLS for unsubscribes: Only allow backend (service_role) access
-- No client (authenticated/anon) access is permitted to unsubscribes.
-- All inserts/updates/deletes/selects must be performed by the backend using the service_role.
-- ---------------------------------------------------------------------------
create policy "Allow insert for service role"
  on public.unsubscribes
  for insert
  to service_role
  with check (true);
create policy "Allow select for service role"
  on public.unsubscribes
  for select
  to service_role
  using (true);
create policy "Allow update for service role"
  on public.unsubscribes
  for update
  to service_role
  using (true)
  with check (true);
create policy "Allow delete for service role"
  on public.unsubscribes
  for delete
  to service_role
  using (true);
-- Allow authenticated users to select their own conversations
create policy "Allow select for participants"
  on public.email_conversations
  for select
  to authenticated
  using (
    user_id = (select id from profiles where id = auth.uid())
  );
-- Allow authenticated users to insert their own conversations
create policy "Allow insert for users"
  on public.email_conversations
  for insert
  to authenticated  
  with check (
    user_id = (select id from profiles where id = auth.uid())
  );
-- Allow authenticated users to select their own messages
create policy "Allow select for sender"
  on public.email_messages
  for select
  to authenticated
  using (
    sender_id = auth.uid()
  );
-- Allow inserting messages if sender is the user
create policy "Allow insert for sender"
  on public.email_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
  );
-- Allow select on events for related messages
create policy "Allow select for related message participants"
  on public.email_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.email_messages
      where id = email_message_id
        and sender_id = auth.uid()
    )
  );
-- Allow update for sender
create policy "Allow update for sender"
  on public.email_messages
  for update
  to authenticated
  using (
    sender_id = auth.uid()
  )
  with check (
    sender_id = auth.uid()
  );
-- Allow delete for sender (optional)
create policy "Allow delete for sender"
  on public.email_messages
  for delete
  to authenticated
  using (
    sender_id = auth.uid()
  );
-- 8. Additional Notes
-- - The webhook handler should insert into email_events for each event received.
-- - The frontend can listen for new events (e.g., via Supabase Realtime) to show badges/toasts.

-- 9. Example: How to use these tables in your webhook
-- When a webhook event is received:
--   1. Find the email_message by resend_email_id.
--   2. Insert a row into email_events with event_type and event_data.
--   3. Update email_messages.status if appropriate (e.g., opened, clicked, bounced).
--   4. For unsubscribes, insert into unsubscribes.

-- End of migration;
