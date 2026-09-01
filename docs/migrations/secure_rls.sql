-- ============================================================
-- RLS 전면 재작성: "방 멤버만 그 방 데이터에 접근"
-- 적용일: 2026-07-31 (작성) / 적용 방법: 대시보드 SQL Editor에 전체 붙여넣고 Run
--
-- ⚠️ 적용 후 동작 변화 (앱 코드가 RPC를 쓰도록 함께 바뀌어야 함):
--   - 방 생성: groups 직접 insert 불가 → rpc('create_group', ...) 사용
--   - 초대코드 입장: groups 직접 select 불가 → rpc('join_group_with_code', ...) 사용
--   - 방 나가기/탈퇴 시 멤버 제거: 직접 update 불가 → rpc('leave_group', ...) 사용
--   - 그 외(보드/할일/가훈/프로필 동기화)는 기존 코드 그대로 동작 (멤버라면)
--   - 초대코드가 서버에서 암호학적 난수로 생성됨 (기존 Math.random 클라 생성 대체)
-- ============================================================

-- ── 0) 헬퍼: 호출자가 해당 그룹의 멤버인가 ─────────────────────
create or replace function public.is_group_member(g uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups gr
    cross join lateral jsonb_array_elements(coalesce(gr.members, '[]'::jsonb)) m
    where gr.id = g
      and m->>'id' = auth.uid()::text
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;

-- ── 1) 방 생성 RPC (생성자를 첫 멤버로 + 초대코드 서버 생성) ──
create or replace function public.create_group(g_name text, g_motto text)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  p record;
  new_code text;
  new_id uuid;
  tries int := 0;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  select * into p from public.profiles where id = auth.uid();
  if p is null then
    raise exception 'profile_required';
  end if;

  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.groups (name, motto, invite_code, members)
      values (
        g_name,
        g_motto,
        new_code,
        jsonb_build_array(jsonb_build_object(
          'id', auth.uid()::text,
          'name', p.name,
          'avatar', p.avatar,
          'color', p.color
        ))
      )
      returning id into new_id;
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 5 then raise; end if;
    end;
  end loop;

  return json_build_object('id', new_id, 'invite_code', new_code);
end;
$$;

revoke all on function public.create_group(text, text) from public;
grant execute on function public.create_group(text, text) to authenticated;

-- ── 2) 초대코드 입장 RPC (코드 검증 + 멤버 추가를 서버에서) ──
create or replace function public.join_group_with_code(code text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  g_id uuid;
  p record;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  select id into g_id from public.groups where invite_code = upper(trim(code));
  if g_id is null then
    return null; -- 존재하지 않는 코드
  end if;
  select * into p from public.profiles where id = auth.uid();
  if p is null then
    raise exception 'profile_required';
  end if;

  update public.groups
     set members = coalesce(members, '[]'::jsonb) || jsonb_build_object(
       'id', auth.uid()::text,
       'name', p.name,
       'avatar', p.avatar,
       'color', p.color
     )
   where id = g_id
     and not exists (
       select 1
       from jsonb_array_elements(coalesce(members, '[]'::jsonb)) m
       where m->>'id' = auth.uid()::text
     );

  return g_id;
end;
$$;

revoke all on function public.join_group_with_code(text) from public;
grant execute on function public.join_group_with_code(text) to authenticated;

-- ── 3) 방 나가기 RPC (본인을 멤버 목록에서 제거) ─────────────
create or replace function public.leave_group(g uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  update public.groups
     set members = (
       select coalesce(jsonb_agg(m), '[]'::jsonb)
       from jsonb_array_elements(coalesce(members, '[]'::jsonb)) m
       where m->>'id' <> auth.uid()::text
     )
   where id = g
     and public.is_group_member(g);
end;
$$;

revoke all on function public.leave_group(uuid) from public;
grant execute on function public.leave_group(uuid) to authenticated;

-- ── 4) groups: 전체 공개 정책 제거 → 멤버 전용 ───────────────
drop policy if exists "Anyone can read groups" on public.groups;
drop policy if exists "Anyone can insert groups" on public.groups;
drop policy if exists "Anyone can update groups" on public.groups;

create policy "groups_select_members" on public.groups
  for select using (public.is_group_member(id));

-- insert 정책 없음: 방 생성은 create_group RPC로만 (security definer가 RLS 우회)
-- delete 정책 없음: 방 삭제 기능 없음

create policy "groups_update_members" on public.groups
  for update
  using (public.is_group_member(id))
  with check (public.is_group_member(id));

-- ── 5) tasks: 전체 공개 정책 제거 → 방 멤버 전용 ─────────────
drop policy if exists "Anyone can read tasks" on public.tasks;
drop policy if exists "Anyone can insert tasks" on public.tasks;
drop policy if exists "Anyone can update tasks" on public.tasks;
drop policy if exists "Anyone can delete tasks" on public.tasks;

create policy "tasks_select_members" on public.tasks
  for select using (public.is_group_member(group_id));

create policy "tasks_insert_members" on public.tasks
  for insert with check (public.is_group_member(group_id));

create policy "tasks_update_members" on public.tasks
  for update
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy "tasks_delete_members" on public.tasks
  for delete using (public.is_group_member(group_id));

-- ── 6) profiles: 읽기는 로그인 사용자만, 삭제 정책 신설 ──────
drop policy if exists "profiles_select" on public.profiles;

create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.uid() is not null);

-- insert/update 는 기존 본인 제한 정책 유지 (auth.uid() = id)

-- 탈퇴 시 프로필 삭제가 조용히 실패하던 문제 수정
create policy "profiles_delete_self" on public.profiles
  for delete using (auth.uid() = id);
