-- Together - Supabase Schema

-- Groups (방)
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  motto       text not null default '',
  created_at  timestamptz not null default now()
);

-- Tasks (할 일 & 쪽지)
create table if not exists public.tasks (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references public.groups(id) on delete cascade,
  content        text not null,
  type           text not null check (type in ('todo', 'note')),
  assignee_id    text,
  assignee_name  text,
  status         text not null default 'pending' check (status in ('pending', 'done')),
  position_x     float not null default 0,
  position_y     float not null default 0,
  rotation       float not null default 0,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);

-- Indexes
create index if not exists tasks_group_id_idx on public.tasks(group_id);
create index if not exists tasks_created_at_idx on public.tasks(created_at desc);

-- Enable Row Level Security
alter table public.groups enable row level security;
alter table public.tasks enable row level security;

-- RLS Policies (공개 접근 - MVP용)
create policy "Anyone can read groups"
  on public.groups for select using (true);

create policy "Anyone can insert groups"
  on public.groups for insert with check (true);

create policy "Anyone can update groups"
  on public.groups for update using (true);

create policy "Anyone can read tasks"
  on public.tasks for select using (true);

create policy "Anyone can insert tasks"
  on public.tasks for insert with check (true);

create policy "Anyone can update tasks"
  on public.tasks for update using (true);

create policy "Anyone can delete tasks"
  on public.tasks for delete using (true);

-- Enable Realtime
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.groups;
