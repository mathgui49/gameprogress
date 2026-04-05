-- ============================================================
-- GameProgress — Schema v4: Column Migrations
-- Adds missing columns to existing tables to match TypeScript types.
-- Safe to run multiple times (IF NOT EXISTS / idempotent).
-- Run AFTER v1, v2, v3 schemas.
-- ============================================================

-- ── Interactions: add tags + contextPhoto ─────────────────
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]';
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS context_photo text;

-- ── Sessions: add address, lat, lng, is_public, max_participants ──
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS max_participants int NOT NULL DEFAULT 10;

-- ── Journal entries: add visibility, entry_type, session_id, attachments,
--    linked_interaction_ids, collection_id, is_collaborative ──
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'entry';
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]';
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS linked_interaction_ids jsonb NOT NULL DEFAULT '[]';
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS collection_id text;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS is_collaborative boolean NOT NULL DEFAULT false;

-- ── Missions: add tracking_type, deadline ─────────────────
ALTER TABLE missions ADD COLUMN IF NOT EXISTS tracking_type text NOT NULL DEFAULT 'custom';
ALTER TABLE missions ADD COLUMN IF NOT EXISTS deadline timestamptz;

-- ── Gamification: add new XP system fields ────────────────
ALTER TABLE gamification ADD COLUMN IF NOT EXISTS best_level int NOT NULL DEFAULT 1;
ALTER TABLE gamification ADD COLUMN IF NOT EXISTS daily_interaction_xp int NOT NULL DEFAULT 0;
ALTER TABLE gamification ADD COLUMN IF NOT EXISTS daily_date text NOT NULL DEFAULT '';

-- ── Posts: add hashtags, mentions, linked_session_id ──────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hashtags jsonb NOT NULL DEFAULT '[]';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS mentions jsonb NOT NULL DEFAULT '[]';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS linked_session_id text;

-- ── Public profiles: add username, bio ────────────────────
ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';

-- ============================================================
-- Indexes for new columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sessions_public ON sessions (is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_journal_visibility ON journal_entries (visibility) WHERE visibility != 'private';
CREATE INDEX IF NOT EXISTS idx_journal_collection ON journal_entries (collection_id) WHERE collection_id IS NOT NULL;
