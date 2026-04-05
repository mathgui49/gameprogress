-- ============================================================
-- GameProgress — Schema v3: RLS + Indexes + Missing Tables
-- Run AFTER supabase-schema.sql and supabase-schema-v2.sql
-- ============================================================

-- ============================================================
-- 1. Create missing tables (added between v1 and v2)
-- ============================================================

-- Public profiles (visible to all authenticated users)
create table if not exists public_profiles (
  user_id text primary key,
  first_name text not null default '',
  location text not null default '',
  bio text not null default '',
  profile_photo text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

-- Wing requests
create table if not exists wing_requests (
  id text primary key,
  from_user_id text not null,
  to_user_id text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Session participants
create table if not exists session_participants (
  id text primary key default gen_random_uuid()::text,
  session_id text not null,
  user_id text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Session likes
create table if not exists session_likes (
  id text primary key default gen_random_uuid()::text,
  session_id text not null,
  user_id text not null,
  created_at timestamptz not null default now(),
  unique(session_id, user_id)
);

-- Session comments
create table if not exists session_comments (
  id text primary key default gen_random_uuid()::text,
  session_id text not null,
  user_id text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);

-- Posts (feed)
create table if not exists posts (
  id text primary key,
  user_id text not null,
  content text not null default '',
  visibility text not null default 'public',
  post_type text not null default 'field_report',
  is_pinned boolean not null default false,
  images jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- Post reactions
create table if not exists post_reactions (
  id text primary key default gen_random_uuid()::text,
  post_id text not null,
  user_id text not null,
  reaction text not null default '👍',
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

-- Post comments
create table if not exists post_comments (
  id text primary key default gen_random_uuid()::text,
  post_id text not null,
  user_id text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);

-- Post reports (moderation)
create table if not exists post_reports (
  id text primary key default gen_random_uuid()::text,
  post_id text not null,
  user_id text not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

-- Post hides (user-specific)
create table if not exists post_hides (
  id text primary key default gen_random_uuid()::text,
  post_id text not null,
  user_id text not null,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

-- Admin settings (key-value store)
create table if not exists admin_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. Enable RLS on ALL missing tables
-- ============================================================

alter table public_profiles enable row level security;
alter table wing_requests enable row level security;
alter table session_participants enable row level security;
alter table session_likes enable row level security;
alter table session_comments enable row level security;
alter table posts enable row level security;
alter table post_reactions enable row level security;
alter table post_comments enable row level security;
alter table post_reports enable row level security;
alter table post_hides enable row level security;
alter table admin_settings enable row level security;

-- ============================================================
-- 3. RLS Policies
-- ============================================================

-- Helper: current user email from JWT
-- auth.jwt() ->> 'email'

-- ── public_profiles ──────────────────────────────────────
-- Anyone authenticated can read public profiles
create policy "Anyone can read public profiles"
  on public_profiles for select
  using (is_public = true);

-- Owner can read their own profile even if not public
create policy "Owner reads own profile"
  on public_profiles for select
  using (user_id = auth.jwt() ->> 'email');

-- Owner can insert/update/delete their own profile
create policy "Owner manages own profile"
  on public_profiles for insert
  with check (user_id = auth.jwt() ->> 'email');

create policy "Owner updates own profile"
  on public_profiles for update
  using (user_id = auth.jwt() ->> 'email')
  with check (user_id = auth.jwt() ->> 'email');

create policy "Owner deletes own profile"
  on public_profiles for delete
  using (user_id = auth.jwt() ->> 'email');

-- ── wing_requests ────────────────────────────────────────
-- Both sender and receiver can read
create policy "Wing request participants can read"
  on wing_requests for select
  using (
    from_user_id = auth.jwt() ->> 'email'
    or to_user_id = auth.jwt() ->> 'email'
  );

-- Sender can create
create policy "User can send wing requests"
  on wing_requests for insert
  with check (from_user_id = auth.jwt() ->> 'email');

-- Both parties can update (accept/reject)
create policy "Participants can update wing requests"
  on wing_requests for update
  using (
    from_user_id = auth.jwt() ->> 'email'
    or to_user_id = auth.jwt() ->> 'email'
  );

-- Both parties can delete
create policy "Participants can delete wing requests"
  on wing_requests for delete
  using (
    from_user_id = auth.jwt() ->> 'email'
    or to_user_id = auth.jwt() ->> 'email'
  );

-- ── session_participants ─────────────────────────────────
-- All authenticated users can read (for public session discovery)
create policy "Anyone can read session participants"
  on session_participants for select
  using (true);

-- User can join (insert themselves)
create policy "User can join sessions"
  on session_participants for insert
  with check (user_id = auth.jwt() ->> 'email');

-- User can update their own participation
create policy "User can update own participation"
  on session_participants for update
  using (user_id = auth.jwt() ->> 'email');

-- User can leave (delete themselves)
create policy "User can leave sessions"
  on session_participants for delete
  using (user_id = auth.jwt() ->> 'email');

-- ── session_likes ────────────────────────────────────────
create policy "Anyone can read session likes"
  on session_likes for select
  using (true);

create policy "User manages own session likes"
  on session_likes for insert
  with check (user_id = auth.jwt() ->> 'email');

create policy "User deletes own session likes"
  on session_likes for delete
  using (user_id = auth.jwt() ->> 'email');

-- ── session_comments ─────────────────────────────────────
create policy "Anyone can read session comments"
  on session_comments for select
  using (true);

create policy "User manages own session comments"
  on session_comments for insert
  with check (user_id = auth.jwt() ->> 'email');

create policy "User deletes own session comments"
  on session_comments for delete
  using (user_id = auth.jwt() ->> 'email');

-- ── posts ────────────────────────────────────────────────
-- Public posts readable by all, wings-only posts by wings
create policy "Anyone can read public posts"
  on posts for select
  using (visibility = 'public');

-- Owner can always read their own posts
create policy "Owner reads own posts"
  on posts for select
  using (user_id = auth.jwt() ->> 'email');

create policy "User manages own posts"
  on posts for insert
  with check (user_id = auth.jwt() ->> 'email');

create policy "User updates own posts"
  on posts for update
  using (user_id = auth.jwt() ->> 'email');

create policy "User deletes own posts"
  on posts for delete
  using (user_id = auth.jwt() ->> 'email');

-- ── post_reactions ───────────────────────────────────────
create policy "Anyone can read post reactions"
  on post_reactions for select
  using (true);

create policy "User manages own reactions"
  on post_reactions for insert
  with check (user_id = auth.jwt() ->> 'email');

create policy "User updates own reactions"
  on post_reactions for update
  using (user_id = auth.jwt() ->> 'email');

create policy "User deletes own reactions"
  on post_reactions for delete
  using (user_id = auth.jwt() ->> 'email');

-- ── post_comments ────────────────────────────────────────
create policy "Anyone can read post comments"
  on post_comments for select
  using (true);

create policy "User manages own post comments"
  on post_comments for insert
  with check (user_id = auth.jwt() ->> 'email');

create policy "User deletes own post comments"
  on post_comments for delete
  using (user_id = auth.jwt() ->> 'email');

-- ── post_reports ─────────────────────────────────────────
-- Users can only create reports (not read others')
create policy "User can report posts"
  on post_reports for insert
  with check (user_id = auth.jwt() ->> 'email');

-- Users can read their own reports
create policy "User reads own reports"
  on post_reports for select
  using (user_id = auth.jwt() ->> 'email');

-- ── post_hides ───────────────────────────────────────────
create policy "User manages own hides"
  on post_hides for all
  using (user_id = auth.jwt() ->> 'email')
  with check (user_id = auth.jwt() ->> 'email');

-- ── admin_settings ───────────────────────────────────────
-- Everyone can read (e.g., announcements)
create policy "Anyone can read admin settings"
  on admin_settings for select
  using (true);

-- Only admin can write — uses env var via function
-- Note: for simplicity, admin write is done via service role key
-- (server-side only). No client-side write policy needed.

-- ============================================================
-- 4. Composite indexes for performance
-- ============================================================

-- Interactions: user lookups sorted by date
create index if not exists idx_interactions_user_date
  on interactions (user_id, created_at desc);

-- Contacts: user + status for pipeline queries
create index if not exists idx_contacts_user_status
  on contacts (user_id, status);

-- Sessions: user + date for timeline
create index if not exists idx_sessions_user_date
  on sessions (user_id, date desc);

-- Posts: visibility + date for feed
create index if not exists idx_posts_visibility_date
  on posts (visibility, created_at desc);

-- Posts: user + date for profile
create index if not exists idx_posts_user_date
  on posts (user_id, created_at desc);

-- Post reactions: post lookup
create index if not exists idx_post_reactions_post
  on post_reactions (post_id);

-- Post comments: post lookup
create index if not exists idx_post_comments_post
  on post_comments (post_id);

-- Session participants: session lookup
create index if not exists idx_session_participants_session
  on session_participants (session_id);

-- Session participants: user lookup
create index if not exists idx_session_participants_user
  on session_participants (user_id);

-- Wing requests: both directions
create index if not exists idx_wing_requests_from
  on wing_requests (from_user_id);
create index if not exists idx_wing_requests_to
  on wing_requests (to_user_id);

-- Messages: conversation lookups
create index if not exists idx_messages_dm
  on messages (from_user_id, to_user_id, created_at desc);
create index if not exists idx_messages_group
  on messages (group_id, created_at desc);
create index if not exists idx_messages_unread
  on messages (to_user_id, is_read);

-- Journal entries: user + date
create index if not exists idx_journal_user_date
  on journal_entries (user_id, date desc);

-- Wing challenges: participant lookups
create index if not exists idx_wing_challenges_creator
  on wing_challenges (created_by);
create index if not exists idx_wing_challenges_target
  on wing_challenges (target_user_id);

-- Wing pings: recent pings lookup
create index if not exists idx_wing_pings_date
  on wing_pings (created_at desc);
