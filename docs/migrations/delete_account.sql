-- 회원 탈퇴 RPC: 모든 방의 멤버 목록에서 제거 + auth 계정 실제 삭제
-- (profiles는 auth.users FK ON DELETE CASCADE로 자동 삭제됨)
-- 적용: 대시보드 SQL Editor에 붙여넣고 Run
-- 앱에서: await supabase.rpc('delete_account') 후 signOut()

create or replace function public.delete_account()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  -- 속해 있던 모든 방의 members에서 제거 (기존엔 현재 방만 지워서 누수됐던 문제 해결)
  update public.groups g
     set members = (
       select coalesce(jsonb_agg(m), '[]'::jsonb)
       from jsonb_array_elements(coalesce(g.members, '[]'::jsonb)) m
       where m->>'id' <> uid::text
     )
   where g.members @> jsonb_build_array(jsonb_build_object('id', uid::text));

  -- auth 계정 삭제 → profiles 는 CASCADE 로 함께 삭제
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
