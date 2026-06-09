-- Require admin review before feature requests become public, and harden forum text input.

do $$
declare
  status_constraint_name text;
begin
  select conname
  into status_constraint_name
  from pg_constraint
  where conrelid = 'public.feature_requests'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if status_constraint_name is not null then
    execute format('alter table public.feature_requests drop constraint %I', status_constraint_name);
  end if;
end;
$$;

alter table public.feature_requests
  add constraint feature_requests_status_check
  check (status in ('pending_review', 'open', 'planned', 'in_progress', 'done', 'declined'));

alter table public.feature_requests
  alter column status set default 'pending_review';

create or replace function public.raise_if_forum_text_has_disallowed_chars(value text, field_name text)
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

  perform public.raise_if_forum_text_has_disallowed_chars(new.title, 'Title');
  perform public.raise_if_forum_text_has_disallowed_chars(new.body, 'Description');

  if char_length(trim(new.title)) > 140 or char_length(trim(new.body)) > 5000 then
    raise exception 'Request is too long.';
  end if;

  if not public.is_forum_admin() then
    -- Force moderation queue defaults for non-admin submissions.
    new.status := 'pending_review';
    new.pinned := false;
    new.locked := false;
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

  perform public.raise_if_forum_text_has_disallowed_chars(new.title, 'Title');
  perform public.raise_if_forum_text_has_disallowed_chars(new.body, 'Description');

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
  feature_status text;
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

  perform public.raise_if_forum_text_has_disallowed_chars(new.body, 'Comment');

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

  select fr.status, fr.locked
  into feature_status, is_locked
  from public.feature_requests fr
  where fr.id = new.feature_id;

  if feature_status is null then
    raise exception 'Feature request not found.';
  end if;

  if feature_status = 'pending_review' and not public.is_forum_admin() then
    raise exception 'This request is pending admin review.';
  end if;

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

  perform public.raise_if_forum_text_has_disallowed_chars(new.body, 'Comment');

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
declare
  feature_status text;
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'user_id must match auth.uid()';
  end if;

  if public.is_forum_blocked(new.user_id) then
    raise exception 'Your account is blocked from voting in the forum.';
  end if;

  select fr.status
  into feature_status
  from public.feature_requests fr
  where fr.id = new.feature_id;

  if feature_status is null then
    raise exception 'Feature request not found.';
  end if;

  if feature_status = 'pending_review' and not public.is_forum_admin() then
    raise exception 'This request is pending admin review.';
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

  perform public.raise_if_forum_text_has_disallowed_chars(new.reason, 'Reason');
  perform public.raise_if_forum_text_has_disallowed_chars(new.details, 'Details');

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

drop policy if exists "feature_requests_public_read" on public.feature_requests;
create policy "feature_requests_public_read"
on public.feature_requests
for select
using (
  status <> 'pending_review'
  or created_by = auth.uid()
  or public.is_forum_admin()
);

drop policy if exists "feature_comments_public_read" on public.feature_comments;
create policy "feature_comments_public_read"
on public.feature_comments
for select
using (
  exists (
    select 1
    from public.feature_requests fr
    where fr.id = feature_comments.feature_id
      and (
        fr.status <> 'pending_review'
        or fr.created_by = auth.uid()
        or public.is_forum_admin()
      )
  )
);
