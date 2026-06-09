-- Lock human verification writes to server-side Turnstile flow only.
-- The Cloudflare Pages Function verifies Turnstile, then calls this RPC with the service role key.

revoke all on function public.mark_forum_human_verified() from public, authenticated, anon;
drop function if exists public.mark_forum_human_verified();

create or replace function public.mark_forum_human_verified_for_user(p_user_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  expires_at_value timestamptz;
begin
  if p_user_id is null then
    raise exception 'User id is required.';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'User not found.';
  end if;

  expires_at_value := now() + interval '15 minutes';

  insert into public.forum_human_verifications (user_id, verified_at, expires_at)
  values (p_user_id, now(), expires_at_value)
  on conflict (user_id)
  do update
    set verified_at = excluded.verified_at,
        expires_at = excluded.expires_at;

  return expires_at_value;
end;
$$;

revoke all on function public.mark_forum_human_verified_for_user(uuid) from public, authenticated, anon;
