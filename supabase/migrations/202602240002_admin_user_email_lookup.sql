-- Admin-only helper to resolve user IDs to auth emails for forum moderation UI.

create or replace function public.get_forum_user_emails(input_user_ids uuid[])
returns table (user_id uuid, email text)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_forum_admin() then
    raise exception 'Only forum admins can access user emails.';
  end if;

  return query
  select u.id, u.email::text
  from auth.users u
  where u.id = any(input_user_ids);
end;
$$;

grant execute on function public.get_forum_user_emails(uuid[]) to authenticated;
