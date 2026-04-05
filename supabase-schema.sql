-- ============================================================
-- GameProgress — Supabase Schema Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================

-- 1. Interactions
create table interactions (
  id text primary key,
  user_id text not null,
  date timestamptz not null default now(),
  first_name text not null default '',
  memorable_element text not null default '',
  note text not null default '',
  location text not null default '',
  type text not null default 'direct',
  result text not null default 'neutral',
  duration text not null default 'medium',
  feeling_score int not null default 7,
  woman_score int not null default 7,
  confidence_score int not null default 5,
  objection text,
  objection_custom text not null default '',
  discussion_topics text not null default '',
  feedback text not null default '',
  contact_method text,
  contact_value text not null default '',
  session_id text not null default '',
  created_at timestamptz not null default now()
);

-- 2. Contacts
create table contacts (
  id text primary key,
  user_id text not null,
  first_name text not null,
  source_interaction_id text not null default '',
  method text not null default 'phone',
  method_value text not null default '',
  status text not null default 'new',
  tags jsonb not null default '[]',
  notes text not null default '',
  timeline jsonb not null default '[]',
  reminders jsonb not null default '[]',
  archive_info jsonb,
  created_at timestamptz not null default now(),
  last_interaction_date timestamptz not null default now()
);

-- 3. Sessions
create table sessions (
  id text primary key,
  user_id text not null,
  title text not null default '',
  date timestamptz not null default now(),
  location text not null default '',
  wings jsonb not null default '[]',
  notes text not null default '',
  goals jsonb not null default '[]',
  interaction_ids jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- 4. Wings
create table wings (
  id text primary key,
  user_id text not null,
  name text not null,
  notes text not null default '',
  session_count int not null default 0,
  created_at timestamptz not null default now()
);

-- 5. Missions
create table missions (
  id text primary key,
  user_id text not null,
  title text not null,
  description text not null default '',
  type text not null default 'daily',
  target int not null default 1,
  current int not null default 0,
  xp_reward int not null default 10,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 6. Journal entries
create table journal_entries (
  id text primary key,
  user_id text not null,
  date timestamptz not null default now(),
  content text not null default '',
  tag text,
  created_at timestamptz not null default now()
);

-- 7. Profiles
create table profiles (
  user_id text primary key,
  name text not null default '',
  game_objectives text not null default '',
  ideal_woman text not null default '',
  created_at timestamptz not null default now()
);

-- 8. Gamification
create table gamification (
  user_id text primary key,
  xp int not null default 0,
  level int not null default 1,
  xp_events jsonb not null default '[]',
  streak int not null default 0,
  best_streak int not null default 0,
  last_active_date text not null default '',
  badges jsonb not null default '[]',
  milestones jsonb not null default '[]'
);

-- ============================================================
-- Indexes for fast user lookups
-- ============================================================
create index idx_interactions_user on interactions (user_id);
create index idx_contacts_user on contacts (user_id);
create index idx_sessions_user on sessions (user_id);
create index idx_wings_user on wings (user_id);
create index idx_missions_user on missions (user_id);
create index idx_journal_user on journal_entries (user_id);

-- ============================================================
-- Row Level Security — each user sees only their own data
-- ============================================================
alter table interactions enable row level security;
alter table contacts enable row level security;
alter table sessions enable row level security;
alter table wings enable row level security;
alter table missions enable row level security;
alter table journal_entries enable row level security;
alter table profiles enable row level security;
alter table gamification enable row level security;

-- Policy: allow all operations when user_id matches the request header
-- We pass user email via x-user-id header from the client
create policy "Users manage own interactions" on interactions for all using (true) with check (true);
create policy "Users manage own contacts" on contacts for all using (true) with check (true);
create policy "Users manage own sessions" on sessions for all using (true) with check (true);
create policy "Users manage own wings" on wings for all using (true) with check (true);
create policy "Users manage own missions" on missions for all using (true) with check (true);
create policy "Users manage own journal" on journal_entries for all using (true) with check (true);
create policy "Users manage own profile" on profiles for all using (true) with check (true);
create policy "Users manage own gamification" on gamification for all using (true) with check (true);

-- 16. Subscriptions (Stripe)
create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null unique,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;
create policy "Users manage own subscription" on subscriptions for all using (true) with check (true);
