-- ============================================================
-- GameProgress — Schema v5: Missing columns + tables
-- Adds columns that were in TypeScript types but never migrated.
-- Also ensures tables from v2 exist (messages, message_groups, etc.)
-- Safe to run multiple times (IF NOT EXISTS / idempotent).
-- Run AFTER v1, v2, v3, v4 schemas.
-- ============================================================

-- ── public_profiles: add missing columns ─────────────────
ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS profile_photo text;
ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS birth_date text;
ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS privacy jsonb NOT NULL DEFAULT '{}';

-- ── messages: create if not exists (was in v2 but may not have been run) ──
CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  from_user_id text NOT NULL,
  to_user_id text,
  group_id text,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

-- Indexes (IF NOT EXISTS not supported for all PG versions, use DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_to') THEN
    CREATE INDEX idx_messages_to ON messages (to_user_id, created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_from') THEN
    CREATE INDEX idx_messages_from ON messages (from_user_id, created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_group_v2') THEN
    CREATE INDEX idx_messages_group_v2 ON messages (group_id, created_at DESC);
  END IF;
END $$;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS policies (use IF NOT EXISTS pattern via DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users see own messages') THEN
    CREATE POLICY "Users see own messages" ON messages FOR SELECT
      USING (from_user_id = auth.jwt() ->> 'email' OR to_user_id = auth.jwt() ->> 'email');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users send messages') THEN
    CREATE POLICY "Users send messages" ON messages FOR INSERT
      WITH CHECK (from_user_id = auth.jwt() ->> 'email');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users mark own as read') THEN
    CREATE POLICY "Users mark own as read" ON messages FOR UPDATE
      USING (to_user_id = auth.jwt() ->> 'email');
  END IF;
END $$;

-- ── message_groups: create if not exists ──
CREATE TABLE IF NOT EXISTS message_groups (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  created_by text NOT NULL,
  member_ids jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE message_groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_groups' AND policyname = 'Members see groups') THEN
    CREATE POLICY "Members see groups" ON message_groups FOR SELECT
      USING (member_ids::text LIKE '%' || auth.jwt() ->> 'email' || '%');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_groups' AND policyname = 'Creator manages groups') THEN
    CREATE POLICY "Creator manages groups" ON message_groups FOR ALL
      USING (created_by = auth.jwt() ->> 'email') WITH CHECK (created_by = auth.jwt() ->> 'email');
  END IF;
END $$;
