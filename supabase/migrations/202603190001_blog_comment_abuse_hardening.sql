-- Harden blog comment input and abuse controls before production launch.

create index if not exists blog_comments_created_by_created_at_idx
  on public.blog_comments (created_by, created_at desc);

create or replace function public.enforce_blog_comment_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if public.is_forum_blocked(new.created_by) and not public.is_forum_admin() then
    raise exception 'Your account is blocked from community commenting.';
  end if;

  perform public.raise_if_forum_text_has_disallowed_chars(new.body, 'Comment');

  if char_length(trim(new.body)) > 2000 then
    raise exception 'Comment is too long.';
  end if;

  if not public.is_forum_admin() and exists (
    select 1
    from public.blog_comments bc
    where bc.created_by = new.created_by
      and bc.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'You can only post one comment every 15 seconds.';
  end if;

  if not public.is_forum_admin() and (
    select count(*)
    from public.blog_comments bc
    where bc.created_by = new.created_by
      and bc.created_at > now() - interval '1 hour'
  ) >= 60 then
    raise exception 'Comment rate limit exceeded. Try again later.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_blog_comment_update_rules()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  if public.is_forum_blocked(new.created_by) and not public.is_forum_admin() then
    raise exception 'Your account is blocked from community commenting.';
  end if;

  perform public.raise_if_forum_text_has_disallowed_chars(new.body, 'Comment');

  if char_length(trim(new.body)) > 2000 then
    raise exception 'Comment is too long.';
  end if;

  return new;
end;
$$;

drop trigger if exists blog_comments_update_rules on public.blog_comments;
create trigger blog_comments_update_rules
before update on public.blog_comments
for each row
execute function public.enforce_blog_comment_update_rules();
