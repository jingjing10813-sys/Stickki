-- Add members column to groups
-- members: [{ "id": "uuid", "name": "이름", "color": "#hex" }]

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS members jsonb NOT NULL DEFAULT '[]';
