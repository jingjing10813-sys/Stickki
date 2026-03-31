-- Add reactions column to tasks
-- reactions: { "❤️": 2, "😂": 1, ... } 형태의 JSONB

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}';
