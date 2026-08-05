-- 프로필 수정 시 모든 방의 members(jsonb) 복사본을 자동 동기화하는 트리거
-- (이중 저장 구조의 정합성 문제 해결 — 앱/웹 코드에서 수동 동기화 불필요)
-- 적용: 대시보드 SQL Editor에 붙여넣고 Run

create or replace function public.sync_member_profile()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update public.groups g
     set members = (
       select jsonb_agg(
         case
           when m->>'id' = new.id::text
           then jsonb_build_object(
             'id', m->>'id',
             'name', new.name,
             'avatar', new.avatar,
             'color', new.color
           )
           else m
         end
       )
       from jsonb_array_elements(g.members) m
     )
   where g.members @> jsonb_build_array(jsonb_build_object('id', new.id::text));
  return new;
end;
$$;

drop trigger if exists profiles_sync_members on public.profiles;
create trigger profiles_sync_members
  after update of name, avatar, color on public.profiles
  for each row
  execute function public.sync_member_profile();
