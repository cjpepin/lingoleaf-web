-- Hardening: blacklist + stronger anti-abuse limits for feature forum.

create table if not exists public.forum_blocked_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text,
  blocked_until timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists forum_blocked_users_blocked_until_idx
  on public.forum_blocked_users (blocked_until);

alter table public.forum_blocked_users enable row level security;

drop policy if exists "forum_blocked_users_admin_read" on public.forum_blocked_users;
create policy "forum_blocked_users_admin_read"
on public.forum_blocked_users
for select
to authenticated
using (public.is_forum_admin());

drop policy if exists "forum_blocked_users_admin_manage" on public.forum_blocked_users;
create policy "forum_blocked_users_admin_manage"
on public.forum_blocked_users
for all
to authenticated
using (public.is_forum_admin())
with check (public.is_forum_admin());

create or replace function public.is_forum_blocked(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.forum_blocked_users fbu
    where fbu.user_id = target_user_id
      and (fbu.blocked_until is null or fbu.blocked_until > now())
  );
$$;

create index if not exists feature_requests_created_by_created_at_idx
  on public.feature_requests (created_by, created_at desc);

create index if not exists feature_comments_created_by_created_at_idx
  on public.feature_comments (created_by, created_at desc);

create index if not exists feature_votes_user_id_created_at_idx
  on public.feature_votes (user_id, created_at desc);

create or replace function public.enforce_feature_request_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if public.is_forum_blocked(new.created_by) then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  if char_length(trim(new.title)) > 140 or char_length(trim(new.body)) > 5000 then
    raise exception 'Request is too long.';
  end if;

  if not public.is_forum_admin() and exists (
    select 1
    from public.feature_requests fr
    where fr.created_by = new.created_by
      and fr.created_at > now() - interval '1 minute'
  ) then
    raise exception 'You can only create one feature request per minute.';
  end if;

  if not public.is_forum_admin() and (
    select count(*)
    from public.feature_requests fr
    where fr.created_by = new.created_by
      and fr.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Request rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_feature_request_update_rules()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  if public.is_forum_blocked(new.created_by) and not public.is_forum_admin() then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  if char_length(trim(new.title)) > 140 or char_length(trim(new.body)) > 5000 then
    raise exception 'Request is too long.';
  end if;

  if not public.is_forum_admin()
    and (
      new.status <> old.status
      or new.pinned <> old.pinned
      or new.locked <> old.locked
    ) then
    raise exception 'Only forum admins can change status, pin, or lock.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_feature_comment_insert_rules()
returns trigger
language plpgsql
as $$
declare
  is_locked boolean;
  link_count integer;
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if public.is_forum_blocked(new.created_by) then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  if char_length(trim(new.body)) > 2000 then
    raise exception 'Comment is too long.';
  end if;

  select coalesce((
    select count(*)
    from regexp_matches(lower(new.body), '(https?://|www\.)', 'g')
  ), 0)
  into link_count;

  if link_count > 4 and not public.is_forum_admin() then
    raise exception 'Too many links in one comment.';
  end if;

  select fr.locked
  into is_locked
  from public.feature_requests fr
  where fr.id = new.feature_id;

  if coalesce(is_locked, false) and not public.is_forum_admin() then
    raise exception 'Comments are locked for this request.';
  end if;

  if not public.is_forum_admin() and exists (
    select 1
    from public.feature_comments fc
    where fc.created_by = new.created_by
      and fc.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'You can only post one comment every 15 seconds.';
  end if;

  if not public.is_forum_admin() and (
    select count(*)
    from public.feature_comments fc
    where fc.created_by = new.created_by
      and fc.created_at > now() - interval '1 hour'
  ) >= 60 then
    raise exception 'Comment rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_feature_comment_update_rules()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  if public.is_forum_blocked(new.created_by) and not public.is_forum_admin() then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  if char_length(trim(new.body)) > 2000 then
    raise exception 'Comment is too long.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_feature_vote_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'user_id must match auth.uid()';
  end if;

  if public.is_forum_blocked(new.user_id) then
    raise exception 'Your account is blocked from voting in the forum.';
  end if;

  if not public.is_forum_admin() and exists (
    select 1
    from public.feature_votes fv
    where fv.user_id = new.user_id
      and fv.created_at > now() - interval '2 seconds'
  ) then
    raise exception 'You are voting too quickly. Slow down.';
  end if;

  if not public.is_forum_admin() and (
    select count(*)
    from public.feature_votes fv
    where fv.user_id = new.user_id
      and fv.created_at > now() - interval '1 hour'
  ) >= 180 then
    raise exception 'Vote rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

drop trigger if exists feature_votes_insert_rules on public.feature_votes;
create trigger feature_votes_insert_rules
before insert on public.feature_votes
for each row
execute function public.enforce_feature_vote_insert_rules();

drop trigger if exists feature_requests_update_rules on public.feature_requests;
create trigger feature_requests_update_rules
before update on public.feature_requests
for each row
execute function public.enforce_feature_request_update_rules();

drop trigger if exists feature_comments_update_rules on public.feature_comments;
create trigger feature_comments_update_rules
before update on public.feature_comments
for each row
execute function public.enforce_feature_comment_update_rules();
