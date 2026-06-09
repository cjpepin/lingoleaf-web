-- Replace service-role write path with least-privilege RPC for human verification.

create or replace function public.mark_forum_human_verified()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  expires_at_value timestamptz;
begin
  uid := auth.uid();

  if uid is null then
    raise exception 'Authentication required.';
  end if;

  expires_at_value := now() + interval '15 minutes';

  insert into public.forum_human_verifications (user_id, verified_at, expires_at)
  values (uid, now(), expires_at_value)
  on conflict (user_id)
  do update
    set verified_at = excluded.verified_at,
        expires_at = excluded.expires_at;

  return expires_at_value;
end;
$$;

grant execute on function public.mark_forum_human_verified() to authenticated;
