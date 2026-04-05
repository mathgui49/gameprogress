-- ============================================================
-- GameProgress — Schema Migration V2
-- New features: Chat, Wing Status, Wing Notes/Categories,
-- Wing Challenges, Pings, Journal Collections/Drafts/Share/Collab
-- ============================================================

-- 1. Messages (1-to-1 and group chat)
create table if not exists messages (
  id text primary key,
  from_user_id text not null,
  to_user_id text,
  group_id text,
  content text not null default '',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index idx_messages_to on messages (to_user_id, created_at desc);
create index idx_messages_from on messages (from_user_id, created_at desc);
create index idx_messages_group on messages (group_id, created_at desc);

alter table messages enable row level security;
create policy "Users see own messages" on messages for select
  using (from_user_id = auth.jwt() ->> 'email' or to_user_id = auth.jwt() ->> 'email');
create policy "Users send messages" on messages for insert
  with check (from_user_id = auth.jwt() ->> 'email');
create policy "Users mark own as read" on messages for update
  using (to_user_id = auth.jwt() ->> 'email');

-- 2. Message Groups (group chat)
create table if not exists message_groups (
  id text primary key,
  name text not null default '',
  created_by text not null,
  member_ids jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table message_groups enable row level security;
create policy "Members see groups" on message_groups for select
  using (member_ids::text like '%' || auth.jwt() ->> 'email' || '%');
create policy "Creator manages groups" on message_groups for all
  using (created_by = auth.jwt() ->> 'email') with check (created_by = auth.jwt() ->> 'email');

-- 3. Wing Status (real-time presence)
create table if not exists wing_status (
  user_id text primary key,
  status text not null default 'offline',
  updated_at timestamptz not null default now()
);

alter table wing_status enable row level security;
create policy "Anyone reads status" on wing_status for select using (true);
create policy "Users manage own status" on wing_status for all
  using (user_id = auth.jwt() ->> 'email') with check (user_id = auth.jwt() ->> 'email');

-- 4. Wing Meta (notes, categories, streaks per wing pair)
create table if not exists wing_meta (
  id text primary key,
  user_id text not null,
  wing_user_id text not null,
  category text,
  notes jsonb not null default '[]',
  shared_session_streak int not null default 0,
  best_shared_streak int not null default 0,
  last_shared_session_date timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, wing_user_id)
);

create index idx_wing_meta_user on wing_meta (user_id);
alter table wing_meta enable row level security;
create policy "Users manage own wing meta" on wing_meta for all
  using (user_id = auth.jwt() ->> 'email') with check (user_id = auth.jwt() ->> 'email');

-- 5. Wing Challenges (1v1 challenges between wings)
create table if not exists wing_challenges (
  id text primary key,
  created_by text not null,
  target_user_id text not null,
  title text not null,
  description text not null default '',
  target int not null default 1,
  current_creator int not null default 0,
  current_target int not null default 0,
  metric text not null default 'approaches',
  deadline timestamptz not null,
  status text not null default 'active',
  winner_id text,
  created_at timestamptz not null default now()
);

create index idx_challenges_creator on wing_challenges (created_by);
create index idx_challenges_target on wing_challenges (target_user_id);

alter table wing_challenges enable row level security;
create policy "Challenge participants see" on wing_challenges for select
  using (created_by = auth.jwt() ->> 'email' or target_user_id = auth.jwt() ->> 'email');
create policy "Creator manages challenges" on wing_challenges for insert
  with check (created_by = auth.jwt() ->> 'email');
create policy "Participants update challenges" on wing_challenges for update
  using (created_by = auth.jwt() ->> 'email' or target_user_id = auth.jwt() ->> 'email');

-- 6. Wing Pings ("Je sors ce soir")
create table if not exists wing_pings (
  id text primary key,
  from_user_id text not null,
  message text not null default '',
  location text not null default '',
  date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  responded_ids jsonb not null default '[]'
);

create index idx_pings_from on wing_pings (from_user_id, created_at desc);
alter table wing_pings enable row level security;
create policy "Wings see pings" on wing_pings for select using (true);
create policy "Users send pings" on wing_pings for insert
  with check (from_user_id = auth.jwt() ->> 'email');
create policy "Users update pings" on wing_pings for update using (true);

-- 7. Journal Collections (folders)
create table if not exists journal_collections (
  id text primary key,
  user_id text not null,
  name text not null,
  description text not null default '',
  entry_ids jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index idx_journal_collections_user on journal_collections (user_id);
alter table journal_collections enable row level security;
create policy "Users manage own collections" on journal_collections for all
  using (user_id = auth.jwt() ->> 'email') with check (user_id = auth.jwt() ->> 'email');

-- 8. Journal Drafts (auto-save)
create table if not exists journal_drafts (
  id text primary key,
  user_id text not null,
  content text not null default '',
  tag text,
  visibility text not null default 'private',
  linked_interaction_ids jsonb not null default '[]',
  collection_id text,
  last_saved_at timestamptz not null default now()
);

create index idx_journal_drafts_user on journal_drafts (user_id);
alter table journal_drafts enable row level security;
create policy "Users manage own drafts" on journal_drafts for all
  using (user_id = auth.jwt() ->> 'email') with check (user_id = auth.jwt() ->> 'email');

-- 9. Journal Share Links
create table if not exists journal_share_links (
  id text primary key,
  user_id text not null,
  entry_id text not null,
  token text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_share_links_token on journal_share_links (token);
alter table journal_share_links enable row level security;
create policy "Users manage own share links" on journal_share_links for all
  using (user_id = auth.jwt() ->> 'email') with check (user_id = auth.jwt() ->> 'email');
create policy "Anyone reads by token" on journal_share_links for select using (true);

-- 10. Collaborative Journal Entries (multi-author contributions)
create table if not exists collaborative_entries (
  id text primary key,
  journal_entry_id text not null,
  author_id text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);

create index idx_collab_entry on collaborative_entries (journal_entry_id);
alter table collaborative_entries enable row level security;
create policy "Participants see collab entries" on collaborative_entries for select using (true);
create policy "Authors write collab entries" on collaborative_entries for insert
  with check (author_id = auth.jwt() ->> 'email');

-- 11. Add new columns to journal_entries
alter table journal_entries add column if not exists linked_interaction_ids jsonb not null default '[]';
alter table journal_entries add column if not exists collection_id text;
alter table journal_entries add column if not exists is_collaborative boolean not null default false;
