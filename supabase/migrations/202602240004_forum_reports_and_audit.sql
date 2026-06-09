-- Adds moderation queue + admin audit logs + DB-enforced human checks for create/comment.

create table if not exists public.forum_human_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists forum_human_verifications_expires_at_idx
  on public.forum_human_verifications (expires_at);

alter table public.forum_human_verifications enable row level security;

drop policy if exists "forum_human_verifications_owner_read" on public.forum_human_verifications;
create policy "forum_human_verifications_owner_read"
on public.forum_human_verifications
for select
to authenticated
using (auth.uid() = user_id or public.is_forum_admin());

create or replace function public.has_recent_human_verification(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.forum_human_verifications hv
    where hv.user_id = target_user_id
      and hv.expires_at > now()
  );
$$;

create table if not exists public.forum_reports (
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
  on public.forum_reports (status, created_at desc);

create index if not exists forum_reports_created_by_idx
  on public.forum_reports (created_by);

create index if not exists forum_reports_target_idx
  on public.forum_reports (target_type, target_id);

create unique index if not exists forum_reports_open_unique_reporter_target_idx
  on public.forum_reports (created_by, target_type, target_id)
  where status in ('open', 'reviewing');

alter table public.forum_reports enable row level security;

drop policy if exists "forum_reports_owner_or_admin_read" on public.forum_reports;
create policy "forum_reports_owner_or_admin_read"
on public.forum_reports
for select
to authenticated
using (created_by = auth.uid() or public.is_forum_admin());

drop policy if exists "forum_reports_authenticated_insert" on public.forum_reports;
create policy "forum_reports_authenticated_insert"
on public.forum_reports
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "forum_reports_admin_update" on public.forum_reports;
create policy "forum_reports_admin_update"
on public.forum_reports
for update
to authenticated
using (public.is_forum_admin())
with check (public.is_forum_admin());

create or replace function public.validate_forum_report_target()
returns trigger
language plpgsql
as $$
begin
  if new.target_type = 'feature_request' and not exists (
    select 1 from public.feature_requests fr where fr.id = new.target_id
  ) then
    raise exception 'Invalid feature request target.';
  end if;

  if new.target_type = 'feature_comment' and not exists (
    select 1 from public.feature_comments fc where fc.id = new.target_id
  ) then
    raise exception 'Invalid feature comment target.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_forum_report_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if public.is_forum_blocked(new.created_by) then
    raise exception 'Your account is blocked from reporting in the forum.';
  end if;

  if not public.is_forum_admin() and exists (
    select 1
    from public.forum_reports r
    where r.created_by = new.created_by
      and r.created_at > now() - interval '20 seconds'
  ) then
    raise exception 'You are submitting reports too quickly.';
  end if;

  return new;
end;
$$;

drop trigger if exists forum_reports_set_updated_at on public.forum_reports;
create trigger forum_reports_set_updated_at
before update on public.forum_reports
for each row
execute function public.set_updated_at();

drop trigger if exists forum_reports_validate_target on public.forum_reports;
create trigger forum_reports_validate_target
before insert or update on public.forum_reports
for each row
execute function public.validate_forum_report_target();

drop trigger if exists forum_reports_insert_rules on public.forum_reports;
create trigger forum_reports_insert_rules
before insert on public.forum_reports
for each row
execute function public.enforce_forum_report_insert_rules();

create table if not exists public.forum_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists forum_admin_audit_logs_created_at_idx
  on public.forum_admin_audit_logs (created_at desc);

create index if not exists forum_admin_audit_logs_admin_idx
  on public.forum_admin_audit_logs (admin_user_id);

alter table public.forum_admin_audit_logs enable row level security;

drop policy if exists "forum_admin_audit_logs_admin_read" on public.forum_admin_audit_logs;
create policy "forum_admin_audit_logs_admin_read"
on public.forum_admin_audit_logs
for select
to authenticated
using (public.is_forum_admin());

create or replace function public.log_forum_admin_action(
  action_name text,
  target_type_name text,
  target_id_value uuid,
  metadata_value jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_forum_admin() then
    raise exception 'Only forum admins can log admin actions.';
  end if;

  insert into public.forum_admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), action_name, target_type_name, target_id_value, coalesce(metadata_value, '{}'::jsonb));
end;
$$;

grant execute on function public.log_forum_admin_action(text, text, uuid, jsonb) to authenticated;

create or replace function public.audit_feature_request_moderation_changes()
returns trigger
language plpgsql
as $$
begin
  if not public.is_forum_admin() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status
      or new.locked is distinct from old.locked
      or new.pinned is distinct from old.pinned then
      perform public.log_forum_admin_action(
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

  perform public.log_forum_admin_action('feature_request_delete', 'feature_request', old.id, '{}'::jsonb);
  return old;
end;
$$;

create or replace function public.audit_feature_comment_deletes()
returns trigger
language plpgsql
as $$
begin
  if public.is_forum_admin() then
    perform public.log_forum_admin_action(
      'feature_comment_delete',
      'feature_comment',
      old.id,
      jsonb_build_object('feature_id', old.feature_id)
    );
  end if;
  return old;
end;
$$;

create or replace function public.audit_forum_report_updates()
returns trigger
language plpgsql
as $$
begin
  if public.is_forum_admin() and (
    new.status is distinct from old.status
    or new.resolved_by is distinct from old.resolved_by
    or new.resolved_at is distinct from old.resolved_at
  ) then
    perform public.log_forum_admin_action(
      'forum_report_update',
      'forum_report',
      new.id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;

  return new;
end;
$$;

create or replace function public.audit_forum_blocklist_changes()
returns trigger
language plpgsql
as $$
begin
  if not public.is_forum_admin() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform public.log_forum_admin_action(
      'forum_user_blocked',
      'user',
      new.user_id,
      jsonb_build_object('reason', new.reason, 'blocked_until', new.blocked_until)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    perform public.log_forum_admin_action(
      'forum_user_block_updated',
      'user',
      new.user_id,
      jsonb_build_object('reason', new.reason, 'blocked_until', new.blocked_until)
    );
    return new;
  end if;

  perform public.log_forum_admin_action('forum_user_unblocked', 'user', old.user_id, '{}'::jsonb);
  return old;
end;
$$;

drop trigger if exists feature_requests_admin_audit on public.feature_requests;
create trigger feature_requests_admin_audit
after update or delete on public.feature_requests
for each row
execute function public.audit_feature_request_moderation_changes();

drop trigger if exists feature_comments_admin_audit on public.feature_comments;
create trigger feature_comments_admin_audit
after delete on public.feature_comments
for each row
execute function public.audit_feature_comment_deletes();

drop trigger if exists forum_reports_admin_audit on public.forum_reports;
create trigger forum_reports_admin_audit
after update on public.forum_reports
for each row
execute function public.audit_forum_report_updates();

drop trigger if exists forum_blocked_users_admin_audit on public.forum_blocked_users;
create trigger forum_blocked_users_admin_audit
after insert or update or delete on public.forum_blocked_users
for each row
execute function public.audit_forum_blocklist_changes();

-- Re-apply create/comment guards with human verification requirement.
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

  if not public.is_forum_admin() and not public.has_recent_human_verification(new.created_by) then
    raise exception 'Human verification required before posting.';
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

  if not public.is_forum_admin() and not public.has_recent_human_verification(new.created_by) then
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
