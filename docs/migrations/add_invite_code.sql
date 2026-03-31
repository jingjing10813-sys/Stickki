-- Add invite_code to groups
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS invite_code text;

-- 기존 방에 코드 채우기
UPDATE public.groups
  SET invite_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  WHERE invite_code IS NULL;

-- NOT NULL + UNIQUE 제약
ALTER TABLE public.groups
  ALTER COLUMN invite_code SET NOT NULL;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_invite_code_unique UNIQUE (invite_code);
