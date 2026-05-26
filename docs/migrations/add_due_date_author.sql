-- Add due_date and author_name columns to tasks
alter table public.tasks
  add column if not exists due_date   date,
  add column if not exists author_name text;
