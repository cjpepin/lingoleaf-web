-- Greenfield LingoLeaf schema for a shared Supabase project.
-- One schema per demo app; auth stays in auth.*.

create schema if not exists lingoleaf;

grant usage on schema lingoleaf to postgres, anon, authenticated, service_role;

alter default privileges in schema lingoleaf
  grant all on tables to anon, authenticated, service_role;

alter default privileges in schema lingoleaf
  grant all on sequences to anon, authenticated, service_role;

alter default privileges in schema lingoleaf
  grant all on functions to anon, authenticated, service_role;

-- Feature Forum schema + RLS
-- Run this in Supabase SQL editor (or via migrations)

create extension if not exists pgcrypto;

create table if not exists lingoleaf.forum_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists lingoleaf.feature_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 140),
  body text not null check (char_length(trim(body)) >= 10),
  tags text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'planned', 'in_progress', 'done', 'declined')),
  pinned boolean not null default false,
  locked boolean not null default false,
  vote_count integer not null default 0 check (vote_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  constraint feature_request_tag_count check (coalesce(array_length(tags, 1), 0) <= 10)
);

create table if not exists lingoleaf.feature_votes (
  feature_id uuid not null references lingoleaf.feature_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feature_id, user_id)
);

create table if not exists lingoleaf.feature_comments (
  id uuid primary key default gen_random_uuid(),
  feature_id uuid not null references lingoleaf.feature_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) >= 2)
);

create index if not exists feature_requests_created_at_idx on lingoleaf.feature_requests (created_at desc);
create index if not exists feature_requests_status_idx on lingoleaf.feature_requests (status);
create index if not exists feature_requests_vote_count_idx on lingoleaf.feature_requests (vote_count desc);
create index if not exists feature_requests_pinned_idx on lingoleaf.feature_requests (pinned desc);
create index if not exists feature_requests_created_by_idx on lingoleaf.feature_requests (created_by);
create index if not exists feature_requests_tags_gin_idx on lingoleaf.feature_requests using gin (tags);

create index if not exists feature_votes_user_id_idx on lingoleaf.feature_votes (user_id);
create index if not exists feature_votes_feature_id_idx on lingoleaf.feature_votes (feature_id);

create index if not exists feature_comments_feature_id_created_at_idx on lingoleaf.feature_comments (feature_id, created_at asc);
create index if not exists feature_comments_created_by_idx on lingoleaf.feature_comments (created_by);

create or replace function lingoleaf.is_forum_admin()
returns boolean
language sql
stable
security definer
set search_path = lingoleaf
as $$
  select exists (
    select 1
    from lingoleaf.forum_admins fa
    where fa.user_id = auth.uid()
  );
$$;

create or replace function lingoleaf.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function lingoleaf.enforce_feature_request_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.feature_requests fr
    where fr.created_by = new.created_by
      and fr.created_at > now() - interval '1 minute'
  ) then
    raise exception 'You can only create one feature request per minute.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_feature_request_update_rules()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  if not lingoleaf.is_forum_admin()
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

create or replace function lingoleaf.apply_vote_count_delta()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update lingoleaf.feature_requests
    set vote_count = vote_count + 1
    where id = new.feature_id;

    return new;
  end if;

  update lingoleaf.feature_requests
  set vote_count = greatest(vote_count - 1, 0)
  where id = old.feature_id;

  return old;
end;
$$;

create or replace function lingoleaf.enforce_feature_comment_insert_rules()
returns trigger
language plpgsql
as $$
declare
  is_locked boolean;
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  select fr.locked
  into is_locked
  from lingoleaf.feature_requests fr
  where fr.id = new.feature_id;

  if coalesce(is_locked, false) and not lingoleaf.is_forum_admin() then
    raise exception 'Comments are locked for this request.';
  end if;

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.feature_comments fc
    where fc.created_by = new.created_by
      and fc.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'You can only post one comment every 15 seconds.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.apply_comment_count_delta()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update lingoleaf.feature_requests
    set comment_count = comment_count + 1
    where id = new.feature_id;

    return new;
  end if;

  update lingoleaf.feature_requests
  set comment_count = greatest(comment_count - 1, 0)
  where id = old.feature_id;

  return old;
end;
$$;

drop trigger if exists feature_requests_set_updated_at on lingoleaf.feature_requests;
create trigger feature_requests_set_updated_at
before update on lingoleaf.feature_requests
for each row
execute function lingoleaf.set_updated_at();

drop trigger if exists feature_requests_insert_rules on lingoleaf.feature_requests;
create trigger feature_requests_insert_rules
before insert on lingoleaf.feature_requests
for each row
execute function lingoleaf.enforce_feature_request_insert_rules();

drop trigger if exists feature_requests_update_rules on lingoleaf.feature_requests;
create trigger feature_requests_update_rules
before update on lingoleaf.feature_requests
for each row
execute function lingoleaf.enforce_feature_request_update_rules();

drop trigger if exists feature_votes_count_trigger on lingoleaf.feature_votes;
create trigger feature_votes_count_trigger
after insert or delete on lingoleaf.feature_votes
for each row
execute function lingoleaf.apply_vote_count_delta();

drop trigger if exists feature_comments_set_updated_at on lingoleaf.feature_comments;
create trigger feature_comments_set_updated_at
before update on lingoleaf.feature_comments
for each row
execute function lingoleaf.set_updated_at();

drop trigger if exists feature_comments_insert_rules on lingoleaf.feature_comments;
create trigger feature_comments_insert_rules
before insert on lingoleaf.feature_comments
for each row
execute function lingoleaf.enforce_feature_comment_insert_rules();

drop trigger if exists feature_comments_count_trigger on lingoleaf.feature_comments;
create trigger feature_comments_count_trigger
after insert or delete on lingoleaf.feature_comments
for each row
execute function lingoleaf.apply_comment_count_delta();

alter table lingoleaf.forum_admins enable row level security;
alter table lingoleaf.feature_requests enable row level security;
alter table lingoleaf.feature_votes enable row level security;
alter table lingoleaf.feature_comments enable row level security;

drop policy if exists "forum_admins_select_self_or_admin" on lingoleaf.forum_admins;
create policy "forum_admins_select_self_or_admin"
on lingoleaf.forum_admins
for select
using (auth.uid() = user_id or lingoleaf.is_forum_admin());

drop policy if exists "forum_admins_manage_admin_only" on lingoleaf.forum_admins;
create policy "forum_admins_manage_admin_only"
on lingoleaf.forum_admins
for all
using (lingoleaf.is_forum_admin())
with check (lingoleaf.is_forum_admin());

drop policy if exists "feature_requests_public_read" on lingoleaf.feature_requests;
create policy "feature_requests_public_read"
on lingoleaf.feature_requests
for select
using (true);

drop policy if exists "feature_requests_insert_authenticated" on lingoleaf.feature_requests;
create policy "feature_requests_insert_authenticated"
on lingoleaf.feature_requests
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "feature_requests_owner_update" on lingoleaf.feature_requests;
create policy "feature_requests_owner_update"
on lingoleaf.feature_requests
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "feature_requests_admin_update" on lingoleaf.feature_requests;
create policy "feature_requests_admin_update"
on lingoleaf.feature_requests
for update
to authenticated
using (lingoleaf.is_forum_admin())
with check (lingoleaf.is_forum_admin());

drop policy if exists "feature_requests_owner_delete" on lingoleaf.feature_requests;
create policy "feature_requests_owner_delete"
on lingoleaf.feature_requests
for delete
to authenticated
using (auth.uid() = created_by);

drop policy if exists "feature_requests_admin_delete" on lingoleaf.feature_requests;
create policy "feature_requests_admin_delete"
on lingoleaf.feature_requests
for delete
to authenticated
using (lingoleaf.is_forum_admin());

drop policy if exists "feature_votes_select_own_or_admin" on lingoleaf.feature_votes;
create policy "feature_votes_select_own_or_admin"
on lingoleaf.feature_votes
for select
to authenticated
using (auth.uid() = user_id or lingoleaf.is_forum_admin());

drop policy if exists "feature_votes_insert_own" on lingoleaf.feature_votes;
create policy "feature_votes_insert_own"
on lingoleaf.feature_votes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "feature_votes_delete_own_or_admin" on lingoleaf.feature_votes;
create policy "feature_votes_delete_own_or_admin"
on lingoleaf.feature_votes
for delete
to authenticated
using (auth.uid() = user_id or lingoleaf.is_forum_admin());

drop policy if exists "feature_comments_public_read" on lingoleaf.feature_comments;
create policy "feature_comments_public_read"
on lingoleaf.feature_comments
for select
using (true);

drop policy if exists "feature_comments_insert_authenticated" on lingoleaf.feature_comments;
create policy "feature_comments_insert_authenticated"
on lingoleaf.feature_comments
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "feature_comments_owner_update" on lingoleaf.feature_comments;
create policy "feature_comments_owner_update"
on lingoleaf.feature_comments
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "feature_comments_admin_update" on lingoleaf.feature_comments;
create policy "feature_comments_admin_update"
on lingoleaf.feature_comments
for update
to authenticated
using (lingoleaf.is_forum_admin())
with check (lingoleaf.is_forum_admin());

drop policy if exists "feature_comments_owner_delete" on lingoleaf.feature_comments;
create policy "feature_comments_owner_delete"
on lingoleaf.feature_comments
for delete
to authenticated
using (auth.uid() = created_by);

drop policy if exists "feature_comments_admin_delete" on lingoleaf.feature_comments;
create policy "feature_comments_admin_delete"
on lingoleaf.feature_comments
for delete
to authenticated
using (lingoleaf.is_forum_admin());

-- Seed your admin user (replace with your auth.users.id UUID):
-- insert into lingoleaf.forum_admins (user_id) values ('00000000-0000-0000-0000-000000000000');

-- Admin-only helper to resolve user IDs to auth emails for forum moderation UI.

create or replace function lingoleaf.get_forum_user_emails(input_user_ids uuid[])
returns table (user_id uuid, email text)
language plpgsql
security definer
set search_path = lingoleaf, auth
as $$
begin
  if not lingoleaf.is_forum_admin() then
    raise exception 'Only forum admins can access user emails.';
  end if;

  return query
  select u.id, u.email::text
  from auth.users u
  where u.id = any(input_user_ids);
end;
$$;

grant execute on function lingoleaf.get_forum_user_emails(uuid[]) to authenticated;

-- Hardening: blacklist + stronger anti-abuse limits for feature forum.

create table if not exists lingoleaf.forum_blocked_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text,
  blocked_until timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists forum_blocked_users_blocked_until_idx
  on lingoleaf.forum_blocked_users (blocked_until);

alter table lingoleaf.forum_blocked_users enable row level security;

drop policy if exists "forum_blocked_users_admin_read" on lingoleaf.forum_blocked_users;
create policy "forum_blocked_users_admin_read"
on lingoleaf.forum_blocked_users
for select
to authenticated
using (lingoleaf.is_forum_admin());

drop policy if exists "forum_blocked_users_admin_manage" on lingoleaf.forum_blocked_users;
create policy "forum_blocked_users_admin_manage"
on lingoleaf.forum_blocked_users
for all
to authenticated
using (lingoleaf.is_forum_admin())
with check (lingoleaf.is_forum_admin());

create or replace function lingoleaf.is_forum_blocked(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = lingoleaf
as $$
  select exists (
    select 1
    from lingoleaf.forum_blocked_users fbu
    where fbu.user_id = target_user_id
      and (fbu.blocked_until is null or fbu.blocked_until > now())
  );
$$;

create index if not exists feature_requests_created_by_created_at_idx
  on lingoleaf.feature_requests (created_by, created_at desc);

create index if not exists feature_comments_created_by_created_at_idx
  on lingoleaf.feature_comments (created_by, created_at desc);

create index if not exists feature_votes_user_id_created_at_idx
  on lingoleaf.feature_votes (user_id, created_at desc);

create or replace function lingoleaf.enforce_feature_request_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if lingoleaf.is_forum_blocked(new.created_by) then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  if char_length(trim(new.title)) > 140 or char_length(trim(new.body)) > 5000 then
    raise exception 'Request is too long.';
  end if;

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.feature_requests fr
    where fr.created_by = new.created_by
      and fr.created_at > now() - interval '1 minute'
  ) then
    raise exception 'You can only create one feature request per minute.';
  end if;

  if not lingoleaf.is_forum_admin() and (
    select count(*)
    from lingoleaf.feature_requests fr
    where fr.created_by = new.created_by
      and fr.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Request rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_feature_request_update_rules()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  if lingoleaf.is_forum_blocked(new.created_by) and not lingoleaf.is_forum_admin() then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  if char_length(trim(new.title)) > 140 or char_length(trim(new.body)) > 5000 then
    raise exception 'Request is too long.';
  end if;

  if not lingoleaf.is_forum_admin()
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

create or replace function lingoleaf.enforce_feature_comment_insert_rules()
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

  if lingoleaf.is_forum_blocked(new.created_by) then
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

  if link_count > 4 and not lingoleaf.is_forum_admin() then
    raise exception 'Too many links in one comment.';
  end if;

  select fr.locked
  into is_locked
  from lingoleaf.feature_requests fr
  where fr.id = new.feature_id;

  if coalesce(is_locked, false) and not lingoleaf.is_forum_admin() then
    raise exception 'Comments are locked for this request.';
  end if;

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.feature_comments fc
    where fc.created_by = new.created_by
      and fc.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'You can only post one comment every 15 seconds.';
  end if;

  if not lingoleaf.is_forum_admin() and (
    select count(*)
    from lingoleaf.feature_comments fc
    where fc.created_by = new.created_by
      and fc.created_at > now() - interval '1 hour'
  ) >= 60 then
    raise exception 'Comment rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_feature_comment_update_rules()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  if lingoleaf.is_forum_blocked(new.created_by) and not lingoleaf.is_forum_admin() then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  if char_length(trim(new.body)) > 2000 then
    raise exception 'Comment is too long.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_feature_vote_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'user_id must match auth.uid()';
  end if;

  if lingoleaf.is_forum_blocked(new.user_id) then
    raise exception 'Your account is blocked from voting in the forum.';
  end if;

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.feature_votes fv
    where fv.user_id = new.user_id
      and fv.created_at > now() - interval '2 seconds'
  ) then
    raise exception 'You are voting too quickly. Slow down.';
  end if;

  if not lingoleaf.is_forum_admin() and (
    select count(*)
    from lingoleaf.feature_votes fv
    where fv.user_id = new.user_id
      and fv.created_at > now() - interval '1 hour'
  ) >= 180 then
    raise exception 'Vote rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

drop trigger if exists feature_votes_insert_rules on lingoleaf.feature_votes;
create trigger feature_votes_insert_rules
before insert on lingoleaf.feature_votes
for each row
execute function lingoleaf.enforce_feature_vote_insert_rules();

drop trigger if exists feature_requests_update_rules on lingoleaf.feature_requests;
create trigger feature_requests_update_rules
before update on lingoleaf.feature_requests
for each row
execute function lingoleaf.enforce_feature_request_update_rules();

drop trigger if exists feature_comments_update_rules on lingoleaf.feature_comments;
create trigger feature_comments_update_rules
before update on lingoleaf.feature_comments
for each row
execute function lingoleaf.enforce_feature_comment_update_rules();

-- Adds moderation queue + admin audit logs + DB-enforced human checks for create/comment.

create table if not exists lingoleaf.forum_human_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists forum_human_verifications_expires_at_idx
  on lingoleaf.forum_human_verifications (expires_at);

alter table lingoleaf.forum_human_verifications enable row level security;

drop policy if exists "forum_human_verifications_owner_read" on lingoleaf.forum_human_verifications;
create policy "forum_human_verifications_owner_read"
on lingoleaf.forum_human_verifications
for select
to authenticated
using (auth.uid() = user_id or lingoleaf.is_forum_admin());

create or replace function lingoleaf.has_recent_human_verification(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = lingoleaf
as $$
  select exists (
    select 1
    from lingoleaf.forum_human_verifications hv
    where hv.user_id = target_user_id
      and hv.expires_at > now()
  );
$$;

create table if not exists lingoleaf.forum_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('feature_request', 'feature_comment')),
  target_id uuid not null,
  reason text not null check (char_length(trim(reason)) between 3 and 80),
  details text not null default '' check (char_length(trim(details)) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolution_note text
);

create index if not exists forum_reports_status_created_at_idx
  on lingoleaf.forum_reports (status, created_at desc);

create index if not exists forum_reports_created_by_idx
  on lingoleaf.forum_reports (created_by);

create index if not exists forum_reports_target_idx
  on lingoleaf.forum_reports (target_type, target_id);

create unique index if not exists forum_reports_open_unique_reporter_target_idx
  on lingoleaf.forum_reports (created_by, target_type, target_id)
  where status in ('open', 'reviewing');

alter table lingoleaf.forum_reports enable row level security;

drop policy if exists "forum_reports_owner_or_admin_read" on lingoleaf.forum_reports;
create policy "forum_reports_owner_or_admin_read"
on lingoleaf.forum_reports
for select
to authenticated
using (created_by = auth.uid() or lingoleaf.is_forum_admin());

drop policy if exists "forum_reports_authenticated_insert" on lingoleaf.forum_reports;
create policy "forum_reports_authenticated_insert"
on lingoleaf.forum_reports
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "forum_reports_admin_update" on lingoleaf.forum_reports;
create policy "forum_reports_admin_update"
on lingoleaf.forum_reports
for update
to authenticated
using (lingoleaf.is_forum_admin())
with check (lingoleaf.is_forum_admin());

create or replace function lingoleaf.validate_forum_report_target()
returns trigger
language plpgsql
as $$
begin
  if new.target_type = 'feature_request' and not exists (
    select 1 from lingoleaf.feature_requests fr where fr.id = new.target_id
  ) then
    raise exception 'Invalid feature request target.';
  end if;

  if new.target_type = 'feature_comment' and not exists (
    select 1 from lingoleaf.feature_comments fc where fc.id = new.target_id
  ) then
    raise exception 'Invalid feature comment target.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_forum_report_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if lingoleaf.is_forum_blocked(new.created_by) then
    raise exception 'Your account is blocked from reporting in the forum.';
  end if;

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.forum_reports r
    where r.created_by = new.created_by
      and r.created_at > now() - interval '20 seconds'
  ) then
    raise exception 'You are submitting reports too quickly.';
  end if;

  return new;
end;
$$;

drop trigger if exists forum_reports_set_updated_at on lingoleaf.forum_reports;
create trigger forum_reports_set_updated_at
before update on lingoleaf.forum_reports
for each row
execute function lingoleaf.set_updated_at();

drop trigger if exists forum_reports_validate_target on lingoleaf.forum_reports;
create trigger forum_reports_validate_target
before insert or update on lingoleaf.forum_reports
for each row
execute function lingoleaf.validate_forum_report_target();

drop trigger if exists forum_reports_insert_rules on lingoleaf.forum_reports;
create trigger forum_reports_insert_rules
before insert on lingoleaf.forum_reports
for each row
execute function lingoleaf.enforce_forum_report_insert_rules();

create table if not exists lingoleaf.forum_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists forum_admin_audit_logs_created_at_idx
  on lingoleaf.forum_admin_audit_logs (created_at desc);

create index if not exists forum_admin_audit_logs_admin_idx
  on lingoleaf.forum_admin_audit_logs (admin_user_id);

alter table lingoleaf.forum_admin_audit_logs enable row level security;

drop policy if exists "forum_admin_audit_logs_admin_read" on lingoleaf.forum_admin_audit_logs;
create policy "forum_admin_audit_logs_admin_read"
on lingoleaf.forum_admin_audit_logs
for select
to authenticated
using (lingoleaf.is_forum_admin());

create or replace function lingoleaf.log_forum_admin_action(
  action_name text,
  target_type_name text,
  target_id_value uuid,
  metadata_value jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = lingoleaf
as $$
begin
  if not lingoleaf.is_forum_admin() then
    raise exception 'Only forum admins can log admin actions.';
  end if;

  insert into lingoleaf.forum_admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), action_name, target_type_name, target_id_value, coalesce(metadata_value, '{}'::jsonb));
end;
$$;

grant execute on function lingoleaf.log_forum_admin_action(text, text, uuid, jsonb) to authenticated;

create or replace function lingoleaf.audit_feature_request_moderation_changes()
returns trigger
language plpgsql
as $$
begin
  if not lingoleaf.is_forum_admin() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status
      or new.locked is distinct from old.locked
      or new.pinned is distinct from old.pinned then
      perform lingoleaf.log_forum_admin_action(
        'feature_request_moderation_update',
        'feature_request',
        new.id,
        jsonb_build_object(
          'old_status', old.status,
          'new_status', new.status,
          'old_locked', old.locked,
          'new_locked', new.locked,
          'old_pinned', old.pinned,
          'new_pinned', new.pinned
        )
      );
    end if;
    return new;
  end if;

  perform lingoleaf.log_forum_admin_action('feature_request_delete', 'feature_request', old.id, '{}'::jsonb);
  return old;
end;
$$;

create or replace function lingoleaf.audit_feature_comment_deletes()
returns trigger
language plpgsql
as $$
begin
  if lingoleaf.is_forum_admin() then
    perform lingoleaf.log_forum_admin_action(
      'feature_comment_delete',
      'feature_comment',
      old.id,
      jsonb_build_object('feature_id', old.feature_id)
    );
  end if;
  return old;
end;
$$;

create or replace function lingoleaf.audit_forum_report_updates()
returns trigger
language plpgsql
as $$
begin
  if lingoleaf.is_forum_admin() and (
    new.status is distinct from old.status
    or new.resolved_by is distinct from old.resolved_by
    or new.resolved_at is distinct from old.resolved_at
  ) then
    perform lingoleaf.log_forum_admin_action(
      'forum_report_update',
      'forum_report',
      new.id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.audit_forum_blocklist_changes()
returns trigger
language plpgsql
as $$
begin
  if not lingoleaf.is_forum_admin() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform lingoleaf.log_forum_admin_action(
      'forum_user_blocked',
      'user',
      new.user_id,
      jsonb_build_object('reason', new.reason, 'blocked_until', new.blocked_until)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    perform lingoleaf.log_forum_admin_action(
      'forum_user_block_updated',
      'user',
      new.user_id,
      jsonb_build_object('reason', new.reason, 'blocked_until', new.blocked_until)
    );
    return new;
  end if;

  perform lingoleaf.log_forum_admin_action('forum_user_unblocked', 'user', old.user_id, '{}'::jsonb);
  return old;
end;
$$;

drop trigger if exists feature_requests_admin_audit on lingoleaf.feature_requests;
create trigger feature_requests_admin_audit
after update or delete on lingoleaf.feature_requests
for each row
execute function lingoleaf.audit_feature_request_moderation_changes();

drop trigger if exists feature_comments_admin_audit on lingoleaf.feature_comments;
create trigger feature_comments_admin_audit
after delete on lingoleaf.feature_comments
for each row
execute function lingoleaf.audit_feature_comment_deletes();

drop trigger if exists forum_reports_admin_audit on lingoleaf.forum_reports;
create trigger forum_reports_admin_audit
after update on lingoleaf.forum_reports
for each row
execute function lingoleaf.audit_forum_report_updates();

drop trigger if exists forum_blocked_users_admin_audit on lingoleaf.forum_blocked_users;
create trigger forum_blocked_users_admin_audit
after insert or update or delete on lingoleaf.forum_blocked_users
for each row
execute function lingoleaf.audit_forum_blocklist_changes();

-- Re-apply create/comment guards with human verification requirement.
create or replace function lingoleaf.enforce_feature_request_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if lingoleaf.is_forum_blocked(new.created_by) then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  if not lingoleaf.is_forum_admin() and not lingoleaf.has_recent_human_verification(new.created_by) then
    raise exception 'Human verification required before posting.';
  end if;

  if char_length(trim(new.title)) > 140 or char_length(trim(new.body)) > 5000 then
    raise exception 'Request is too long.';
  end if;

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.feature_requests fr
    where fr.created_by = new.created_by
      and fr.created_at > now() - interval '1 minute'
  ) then
    raise exception 'You can only create one feature request per minute.';
  end if;

  if not lingoleaf.is_forum_admin() and (
    select count(*)
    from lingoleaf.feature_requests fr
    where fr.created_by = new.created_by
      and fr.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Request rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_feature_comment_insert_rules()
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

  if lingoleaf.is_forum_blocked(new.created_by) then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  if not lingoleaf.is_forum_admin() and not lingoleaf.has_recent_human_verification(new.created_by) then
    raise exception 'Human verification required before commenting.';
  end if;

  if char_length(trim(new.body)) > 2000 then
    raise exception 'Comment is too long.';
  end if;

  select coalesce((
    select count(*)
    from regexp_matches(lower(new.body), '(https?://|www\.)', 'g')
  ), 0)
  into link_count;

  if link_count > 4 and not lingoleaf.is_forum_admin() then
    raise exception 'Too many links in one comment.';
  end if;

  select fr.locked
  into is_locked
  from lingoleaf.feature_requests fr
  where fr.id = new.feature_id;

  if coalesce(is_locked, false) and not lingoleaf.is_forum_admin() then
    raise exception 'Comments are locked for this request.';
  end if;

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.feature_comments fc
    where fc.created_by = new.created_by
      and fc.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'You can only post one comment every 15 seconds.';
  end if;

  if not lingoleaf.is_forum_admin() and (
    select count(*)
    from lingoleaf.feature_comments fc
    where fc.created_by = new.created_by
      and fc.created_at > now() - interval '1 hour'
  ) >= 60 then
    raise exception 'Comment rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

-- Replace service-role write path with least-privilege RPC for human verification.

create or replace function lingoleaf.mark_forum_human_verified()
returns timestamptz
language plpgsql
security definer
set search_path = lingoleaf
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

  insert into lingoleaf.forum_human_verifications (user_id, verified_at, expires_at)
  values (uid, now(), expires_at_value)
  on conflict (user_id)
  do update
    set verified_at = excluded.verified_at,
        expires_at = excluded.expires_at;

  return expires_at_value;
end;
$$;

grant execute on function lingoleaf.mark_forum_human_verified() to authenticated;

-- App Updates blog posts + comments

create table if not exists lingoleaf.blog_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 200),
  summary text not null default '' check (char_length(summary) <= 280),
  body text not null check (char_length(trim(body)) >= 20),
  comment_count integer not null default 0 check (comment_count >= 0)
);

create table if not exists lingoleaf.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references lingoleaf.blog_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 2 and 2000)
);

create index if not exists blog_posts_created_at_idx
  on lingoleaf.blog_posts (created_at desc);

create index if not exists blog_posts_created_by_idx
  on lingoleaf.blog_posts (created_by);

create index if not exists blog_comments_post_id_created_at_idx
  on lingoleaf.blog_comments (post_id, created_at asc);

create index if not exists blog_comments_created_by_idx
  on lingoleaf.blog_comments (created_by);

create or replace function lingoleaf.enforce_blog_post_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if not lingoleaf.is_forum_admin() then
    raise exception 'Only admins can create blog posts.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_blog_post_update_rules()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  if not lingoleaf.is_forum_admin() then
    raise exception 'Only admins can update blog posts.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_blog_comment_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.apply_blog_comment_count_delta()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update lingoleaf.blog_posts
    set comment_count = comment_count + 1
    where id = new.post_id;

    return new;
  end if;

  update lingoleaf.blog_posts
  set comment_count = greatest(comment_count - 1, 0)
  where id = old.post_id;

  return old;
end;
$$;

drop trigger if exists blog_posts_set_updated_at on lingoleaf.blog_posts;
create trigger blog_posts_set_updated_at
before update on lingoleaf.blog_posts
for each row
execute function lingoleaf.set_updated_at();

drop trigger if exists blog_posts_insert_rules on lingoleaf.blog_posts;
create trigger blog_posts_insert_rules
before insert on lingoleaf.blog_posts
for each row
execute function lingoleaf.enforce_blog_post_insert_rules();

drop trigger if exists blog_posts_update_rules on lingoleaf.blog_posts;
create trigger blog_posts_update_rules
before update on lingoleaf.blog_posts
for each row
execute function lingoleaf.enforce_blog_post_update_rules();

drop trigger if exists blog_comments_set_updated_at on lingoleaf.blog_comments;
create trigger blog_comments_set_updated_at
before update on lingoleaf.blog_comments
for each row
execute function lingoleaf.set_updated_at();

drop trigger if exists blog_comments_insert_rules on lingoleaf.blog_comments;
create trigger blog_comments_insert_rules
before insert on lingoleaf.blog_comments
for each row
execute function lingoleaf.enforce_blog_comment_insert_rules();

drop trigger if exists blog_comments_count_trigger on lingoleaf.blog_comments;
create trigger blog_comments_count_trigger
after insert or delete on lingoleaf.blog_comments
for each row
execute function lingoleaf.apply_blog_comment_count_delta();

alter table lingoleaf.blog_posts enable row level security;
alter table lingoleaf.blog_comments enable row level security;

drop policy if exists "blog_posts_public_read" on lingoleaf.blog_posts;
create policy "blog_posts_public_read"
on lingoleaf.blog_posts
for select
using (true);

drop policy if exists "blog_posts_admin_insert" on lingoleaf.blog_posts;
create policy "blog_posts_admin_insert"
on lingoleaf.blog_posts
for insert
to authenticated
with check (lingoleaf.is_forum_admin() and auth.uid() = created_by);

drop policy if exists "blog_posts_admin_update" on lingoleaf.blog_posts;
create policy "blog_posts_admin_update"
on lingoleaf.blog_posts
for update
to authenticated
using (lingoleaf.is_forum_admin())
with check (lingoleaf.is_forum_admin());

drop policy if exists "blog_posts_admin_delete" on lingoleaf.blog_posts;
create policy "blog_posts_admin_delete"
on lingoleaf.blog_posts
for delete
to authenticated
using (lingoleaf.is_forum_admin());

drop policy if exists "blog_comments_public_read" on lingoleaf.blog_comments;
create policy "blog_comments_public_read"
on lingoleaf.blog_comments
for select
using (true);

drop policy if exists "blog_comments_authenticated_insert" on lingoleaf.blog_comments;
create policy "blog_comments_authenticated_insert"
on lingoleaf.blog_comments
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "blog_comments_owner_update" on lingoleaf.blog_comments;
create policy "blog_comments_owner_update"
on lingoleaf.blog_comments
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "blog_comments_admin_update" on lingoleaf.blog_comments;
create policy "blog_comments_admin_update"
on lingoleaf.blog_comments
for update
to authenticated
using (lingoleaf.is_forum_admin())
with check (lingoleaf.is_forum_admin());

drop policy if exists "blog_comments_owner_delete" on lingoleaf.blog_comments;
create policy "blog_comments_owner_delete"
on lingoleaf.blog_comments
for delete
to authenticated
using (auth.uid() = created_by);

drop policy if exists "blog_comments_admin_delete" on lingoleaf.blog_comments;
create policy "blog_comments_admin_delete"
on lingoleaf.blog_comments
for delete
to authenticated
using (lingoleaf.is_forum_admin());

-- Require admin review before feature requests become public, and harden forum text input.

do $$
declare
  status_constraint_name text;
begin
  select conname
  into status_constraint_name
  from pg_constraint
  where conrelid = 'lingoleaf.feature_requests'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if status_constraint_name is not null then
    execute format('alter table lingoleaf.feature_requests drop constraint %I', status_constraint_name);
  end if;
end;
$$;

alter table lingoleaf.feature_requests
  add constraint feature_requests_status_check
  check (status in ('pending_review', 'open', 'planned', 'in_progress', 'done', 'declined'));

alter table lingoleaf.feature_requests
  alter column status set default 'pending_review';

create or replace function lingoleaf.raise_if_forum_text_has_disallowed_chars(value text, field_name text)
returns void
language plpgsql
immutable
as $$
declare
  normalized text;
begin
  if value is null then
    return;
  end if;

  normalized := regexp_replace(value, E'[\\n\\r\\t]', '', 'g');
  if normalized ~ '[[:cntrl:]]' then
    raise exception '% contains unsupported control characters.', field_name;
  end if;
end;
$$;

create or replace function lingoleaf.enforce_feature_request_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if lingoleaf.is_forum_blocked(new.created_by) then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  if not lingoleaf.is_forum_admin() and not lingoleaf.has_recent_human_verification(new.created_by) then
    raise exception 'Human verification required before posting.';
  end if;

  perform lingoleaf.raise_if_forum_text_has_disallowed_chars(new.title, 'Title');
  perform lingoleaf.raise_if_forum_text_has_disallowed_chars(new.body, 'Description');

  if char_length(trim(new.title)) > 140 or char_length(trim(new.body)) > 5000 then
    raise exception 'Request is too long.';
  end if;

  if not lingoleaf.is_forum_admin() then
    -- Force moderation queue defaults for non-admin submissions.
    new.status := 'pending_review';
    new.pinned := false;
    new.locked := false;
  end if;

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.feature_requests fr
    where fr.created_by = new.created_by
      and fr.created_at > now() - interval '1 minute'
  ) then
    raise exception 'You can only create one feature request per minute.';
  end if;

  if not lingoleaf.is_forum_admin() and (
    select count(*)
    from lingoleaf.feature_requests fr
    where fr.created_by = new.created_by
      and fr.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Request rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_feature_request_update_rules()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  if lingoleaf.is_forum_blocked(new.created_by) and not lingoleaf.is_forum_admin() then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  perform lingoleaf.raise_if_forum_text_has_disallowed_chars(new.title, 'Title');
  perform lingoleaf.raise_if_forum_text_has_disallowed_chars(new.body, 'Description');

  if char_length(trim(new.title)) > 140 or char_length(trim(new.body)) > 5000 then
    raise exception 'Request is too long.';
  end if;

  if not lingoleaf.is_forum_admin()
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

create or replace function lingoleaf.enforce_feature_comment_insert_rules()
returns trigger
language plpgsql
as $$
declare
  feature_status text;
  is_locked boolean;
  link_count integer;
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if lingoleaf.is_forum_blocked(new.created_by) then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  if not lingoleaf.is_forum_admin() and not lingoleaf.has_recent_human_verification(new.created_by) then
    raise exception 'Human verification required before commenting.';
  end if;

  perform lingoleaf.raise_if_forum_text_has_disallowed_chars(new.body, 'Comment');

  if char_length(trim(new.body)) > 2000 then
    raise exception 'Comment is too long.';
  end if;

  select coalesce((
    select count(*)
    from regexp_matches(lower(new.body), '(https?://|www\.)', 'g')
  ), 0)
  into link_count;

  if link_count > 4 and not lingoleaf.is_forum_admin() then
    raise exception 'Too many links in one comment.';
  end if;

  select fr.status, fr.locked
  into feature_status, is_locked
  from lingoleaf.feature_requests fr
  where fr.id = new.feature_id;

  if feature_status is null then
    raise exception 'Feature request not found.';
  end if;

  if feature_status = 'pending_review' and not lingoleaf.is_forum_admin() then
    raise exception 'This request is pending admin review.';
  end if;

  if coalesce(is_locked, false) and not lingoleaf.is_forum_admin() then
    raise exception 'Comments are locked for this request.';
  end if;

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.feature_comments fc
    where fc.created_by = new.created_by
      and fc.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'You can only post one comment every 15 seconds.';
  end if;

  if not lingoleaf.is_forum_admin() and (
    select count(*)
    from lingoleaf.feature_comments fc
    where fc.created_by = new.created_by
      and fc.created_at > now() - interval '1 hour'
  ) >= 60 then
    raise exception 'Comment rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_feature_comment_update_rules()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  if lingoleaf.is_forum_blocked(new.created_by) and not lingoleaf.is_forum_admin() then
    raise exception 'Your account is blocked from posting in the forum.';
  end if;

  perform lingoleaf.raise_if_forum_text_has_disallowed_chars(new.body, 'Comment');

  if char_length(trim(new.body)) > 2000 then
    raise exception 'Comment is too long.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_feature_vote_insert_rules()
returns trigger
language plpgsql
as $$
declare
  feature_status text;
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'user_id must match auth.uid()';
  end if;

  if lingoleaf.is_forum_blocked(new.user_id) then
    raise exception 'Your account is blocked from voting in the forum.';
  end if;

  select fr.status
  into feature_status
  from lingoleaf.feature_requests fr
  where fr.id = new.feature_id;

  if feature_status is null then
    raise exception 'Feature request not found.';
  end if;

  if feature_status = 'pending_review' and not lingoleaf.is_forum_admin() then
    raise exception 'This request is pending admin review.';
  end if;

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.feature_votes fv
    where fv.user_id = new.user_id
      and fv.created_at > now() - interval '2 seconds'
  ) then
    raise exception 'You are voting too quickly. Slow down.';
  end if;

  if not lingoleaf.is_forum_admin() and (
    select count(*)
    from lingoleaf.feature_votes fv
    where fv.user_id = new.user_id
      and fv.created_at > now() - interval '1 hour'
  ) >= 180 then
    raise exception 'Vote rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_forum_report_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if lingoleaf.is_forum_blocked(new.created_by) then
    raise exception 'Your account is blocked from reporting in the forum.';
  end if;

  perform lingoleaf.raise_if_forum_text_has_disallowed_chars(new.reason, 'Reason');
  perform lingoleaf.raise_if_forum_text_has_disallowed_chars(new.details, 'Details');

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.forum_reports r
    where r.created_by = new.created_by
      and r.created_at > now() - interval '20 seconds'
  ) then
    raise exception 'You are submitting reports too quickly.';
  end if;

  return new;
end;
$$;

drop policy if exists "feature_requests_public_read" on lingoleaf.feature_requests;
create policy "feature_requests_public_read"
on lingoleaf.feature_requests
for select
using (
  status <> 'pending_review'
  or created_by = auth.uid()
  or lingoleaf.is_forum_admin()
);

drop policy if exists "feature_comments_public_read" on lingoleaf.feature_comments;
create policy "feature_comments_public_read"
on lingoleaf.feature_comments
for select
using (
  exists (
    select 1
    from lingoleaf.feature_requests fr
    where fr.id = feature_comments.feature_id
      and (
        fr.status <> 'pending_review'
        or fr.created_by = auth.uid()
        or lingoleaf.is_forum_admin()
      )
  )
);

-- Harden blog comment input and abuse controls before production launch.

create index if not exists blog_comments_created_by_created_at_idx
  on lingoleaf.blog_comments (created_by, created_at desc);

create or replace function lingoleaf.enforce_blog_comment_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if lingoleaf.is_forum_blocked(new.created_by) and not lingoleaf.is_forum_admin() then
    raise exception 'Your account is blocked from community commenting.';
  end if;

  perform lingoleaf.raise_if_forum_text_has_disallowed_chars(new.body, 'Comment');

  if char_length(trim(new.body)) > 2000 then
    raise exception 'Comment is too long.';
  end if;

  if not lingoleaf.is_forum_admin() and exists (
    select 1
    from lingoleaf.blog_comments bc
    where bc.created_by = new.created_by
      and bc.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'You can only post one comment every 15 seconds.';
  end if;

  if not lingoleaf.is_forum_admin() and (
    select count(*)
    from lingoleaf.blog_comments bc
    where bc.created_by = new.created_by
      and bc.created_at > now() - interval '1 hour'
  ) >= 60 then
    raise exception 'Comment rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

create or replace function lingoleaf.enforce_blog_comment_update_rules()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  if lingoleaf.is_forum_blocked(new.created_by) and not lingoleaf.is_forum_admin() then
    raise exception 'Your account is blocked from community commenting.';
  end if;

  perform lingoleaf.raise_if_forum_text_has_disallowed_chars(new.body, 'Comment');

  if char_length(trim(new.body)) > 2000 then
    raise exception 'Comment is too long.';
  end if;

  return new;
end;
$$;

drop trigger if exists blog_comments_update_rules on lingoleaf.blog_comments;
create trigger blog_comments_update_rules
before update on lingoleaf.blog_comments
for each row
execute function lingoleaf.enforce_blog_comment_update_rules();

-- Lock human verification writes to server-side Turnstile flow only.
-- The Cloudflare Pages Function verifies Turnstile, then calls this RPC with the service role key.

revoke all on function lingoleaf.mark_forum_human_verified() from public, authenticated, anon;
drop function if exists lingoleaf.mark_forum_human_verified();

create or replace function lingoleaf.mark_forum_human_verified_for_user(p_user_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = lingoleaf
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

  insert into lingoleaf.forum_human_verifications (user_id, verified_at, expires_at)
  values (p_user_id, now(), expires_at_value)
  on conflict (user_id)
  do update
    set verified_at = excluded.verified_at,
        expires_at = excluded.expires_at;

  return expires_at_value;
end;
$$;

revoke all on function lingoleaf.mark_forum_human_verified_for_user(uuid) from public, authenticated, anon;

-- Mobile app analytics events + admin dashboard RPCs.
-- Matches the admin analytics API consumed by functions/api/admin-analytics.ts.

create table if not exists lingoleaf.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (char_length(trim(event_name)) between 1 and 120),
  event_version integer not null default 1 check (event_version >= 1),
  install_id text,
  app_version text,
  platform text,
  locale text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_created_at_idx
  on lingoleaf.analytics_events (created_at desc);

create index if not exists analytics_events_event_name_idx
  on lingoleaf.analytics_events (event_name);

create index if not exists analytics_events_user_id_idx
  on lingoleaf.analytics_events (user_id);

alter table lingoleaf.analytics_events enable row level security;

drop policy if exists analytics_events_insert_authenticated on lingoleaf.analytics_events;
create policy analytics_events_insert_authenticated
  on lingoleaf.analytics_events
  for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

create or replace function lingoleaf.analytics_is_failure_event(p_event_name text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_event_name, '') ~* '(fail|error|exception|timeout|invalid|reject|denied|blocked|abandon|drop|cancel)';
$$;

create or replace function lingoleaf.analytics_admin_dashboard(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = lingoleaf
as $$
declare
  result jsonb;
begin
  if not lingoleaf.is_forum_admin() then
    raise exception 'Not authorized for analytics dashboard.' using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_from >= p_to then
    raise exception 'Invalid date range.' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'totals', jsonb_build_object(
      'events', count(*)::bigint,
      'failures', count(*) filter (where lingoleaf.analytics_is_failure_event(event_name))::bigint,
      'users', count(distinct user_id) filter (where user_id is not null)::bigint,
      'installs', count(distinct install_id) filter (where install_id is not null and install_id <> '')::bigint,
      'last_event_at', max(created_at)
    ),
    'daily_events', coalesce(
      (
        select jsonb_agg(jsonb_build_object('day', day_bucket, 'count', event_count) order by day_bucket)
        from (
          select date_trunc('day', created_at) as day_bucket, count(*) as event_count
          from lingoleaf.analytics_events
          where created_at >= p_from and created_at < p_to
          group by 1
        ) daily
      ),
      '[]'::jsonb
    ),
    'daily_failures', coalesce(
      (
        select jsonb_agg(jsonb_build_object('day', day_bucket, 'count', failure_count) order by day_bucket)
        from (
          select date_trunc('day', created_at) as day_bucket, count(*) as failure_count
          from lingoleaf.analytics_events
          where created_at >= p_from and created_at < p_to
            and lingoleaf.analytics_is_failure_event(event_name)
          group by  1
        ) daily_failures
      ),
      '[]'::jsonb
    ),
    'top_events', coalesce(
      (
        select jsonb_agg(jsonb_build_object('event_name', event_name, 'count', event_count) order by event_count desc, event_name asc)
        from (
          select event_name, count(*) as event_count
          from lingoleaf.analytics_events
          where created_at >= p_from and created_at < p_to
          group by event_name
          order by event_count desc, event_name asc
          limit 20
        ) top_rows
      ),
      '[]'::jsonb
    )
  )
  into result
  from lingoleaf.analytics_events
  where created_at >= p_from and created_at < p_to;

  return coalesce(result, jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'totals', jsonb_build_object(
      'events', 0,
      'failures', 0,
      'users', 0,
      'installs', 0,
      'last_event_at', null
    ),
    'daily_events', '[]'::jsonb,
    'daily_failures', '[]'::jsonb,
    'top_events', '[]'::jsonb
  ));
end;
$$;

create or replace function lingoleaf.analytics_admin_recent_events(
  p_limit integer,
  p_from timestamptz,
  p_to timestamptz
)
returns setof lingoleaf.analytics_events
language plpgsql
security definer
set search_path = lingoleaf
as $$
declare
  bounded_limit integer;
begin
  if not lingoleaf.is_forum_admin() then
    raise exception 'Not authorized for analytics dashboard.' using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_from >= p_to then
    raise exception 'Invalid date range.' using errcode = '22023';
  end if;

  bounded_limit := least(greatest(coalesce(p_limit, 50), 1), 200);

  return query
  select ae.*
  from lingoleaf.analytics_events ae
  where ae.created_at >= p_from
    and ae.created_at < p_to
  order by ae.created_at desc
  limit bounded_limit;
end;
$$;

grant execute on function lingoleaf.analytics_admin_dashboard(timestamptz, timestamptz) to authenticated;
grant execute on function lingoleaf.analytics_admin_recent_events(integer, timestamptz, timestamptz) to authenticated;

