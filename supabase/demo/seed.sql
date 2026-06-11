-- LingoLeaf web demo seed (generated from fixtures/demo-seed/lingoleaf-web.json)
-- Bypass auth/rate-limit triggers; vote/comment counts are seeded explicitly.
BEGIN;
SET LOCAL session_replication_role = replica;

INSERT INTO lingoleaf.forum_admins (user_id) VALUES ('00000000-0000-4000-8000-000000000099'::uuid) ON CONFLICT (user_id) DO NOTHING;

INSERT INTO lingoleaf.feature_requests (id, created_by, title, body, tags, status, pinned, locked, vote_count, comment_count, created_at, updated_at)
VALUES
  ('33333333-3333-4333-8333-333333333301'::uuid, '00000000-0000-4000-8000-000000000002'::uuid, 'Offline flashcard reviews', 'Would love to review saved vocabulary on flights without needing cell service. Cache the next N cards locally and sync review results when back online.', array['flashcards', 'offline'], 'planned', true, false, 42, 3, '2025-11-12T14:00:00.000Z', '2025-12-01T10:00:00.000Z'),
  ('33333333-3333-4333-8333-333333333302'::uuid, '00000000-0000-4000-8000-000000000003'::uuid, 'Garden mode streak recovery', 'If I miss a day because of travel, let me spend GP to protect my streak once per month instead of resetting to seed stage.', array['garden', 'goals'], 'open', false, false, 28, 2, '2025-12-05T09:30:00.000Z', '2025-12-05T09:30:00.000Z'),
  ('33333333-3333-4333-8333-333333333303'::uuid, '00000000-0000-4000-8000-000000000002'::uuid, 'Highlight colors per language', 'Auto-assign highlight colors based on source language so my Spanish and French passages are visually distinct in the reader.', array['reader', 'highlights'], 'in_progress', false, false, 19, 4, '2026-01-18T16:00:00.000Z', '2026-03-10T11:00:00.000Z'),
  ('33333333-3333-4333-8333-333333333304'::uuid, '00000000-0000-4000-8000-000000000003'::uuid, 'Import Anki decks', 'Many learners already have curated decks. Support importing a basic Anki CSV into a vocab list with term and translation columns.', array['import', 'study'], 'open', false, false, 35, 1, '2026-02-02T08:00:00.000Z', '2026-02-02T08:00:00.000Z'),
  ('33333333-3333-4333-8333-333333333305'::uuid, '00000000-0000-4000-8000-000000000002'::uuid, 'iPad split-screen reader', 'On iPad, show the translation sheet beside the EPUB instead of covering the text. Especially helpful for study sessions.', array['ipad', 'reader'], 'done', false, true, 51, 5, '2025-09-01T12:00:00.000Z', '2026-04-01T09:00:00.000Z'),
  ('33333333-3333-4333-8333-333333333306'::uuid, '00000000-0000-4000-8000-000000000003'::uuid, 'Community reading challenges', 'Monthly themed challenges (e.g. 20 minutes of French per day) with lightweight leaderboards and optional forum threads.', array['community', 'goals'], 'declined', false, false, 8, 2, '2025-10-20T10:00:00.000Z', '2025-11-30T15:00:00.000Z'),
  ('33333333-3333-4333-8333-333333333307'::uuid, '00000000-0000-4000-8000-000000000002'::uuid, 'Pronunciation audio on flashcards', 'Play TTS for the source term when flipping a card. Helpful for tonal languages and French liaison practice.', array['flashcards', 'audio'], 'open', false, false, 22, 0, '2026-04-15T13:00:00.000Z', '2026-04-15T13:00:00.000Z'),
  ('33333333-3333-4333-8333-333333333308'::uuid, '00000000-0000-4000-8000-000000000003'::uuid, 'Dark mode for web forum', 'The companion site is bright when I''m reading at night. Match the app''s dark palette on /features and /updates.', array['web', 'design'], 'planned', false, false, 14, 1, '2026-05-01T18:00:00.000Z', '2026-05-20T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, tags = EXCLUDED.tags, status = EXCLUDED.status, pinned = EXCLUDED.pinned, locked = EXCLUDED.locked, vote_count = EXCLUDED.vote_count, comment_count = EXCLUDED.comment_count, updated_at = EXCLUDED.updated_at;

INSERT INTO lingoleaf.feature_votes (feature_id, user_id)
VALUES
  ('33333333-3333-4333-8333-333333333301'::uuid, '00000000-0000-4000-8000-000000000003'::uuid),
  ('33333333-3333-4333-8333-333333333302'::uuid, '00000000-0000-4000-8000-000000000002'::uuid),
  ('33333333-3333-4333-8333-333333333303'::uuid, '00000000-0000-4000-8000-000000000003'::uuid),
  ('33333333-3333-4333-8333-333333333304'::uuid, '00000000-0000-4000-8000-000000000002'::uuid),
  ('33333333-3333-4333-8333-333333333305'::uuid, '00000000-0000-4000-8000-000000000002'::uuid),
  ('33333333-3333-4333-8333-333333333305'::uuid, '00000000-0000-4000-8000-000000000003'::uuid)
ON CONFLICT (feature_id, user_id) DO NOTHING;

INSERT INTO lingoleaf.feature_comments (id, feature_id, created_by, body, created_at, updated_at)
VALUES
  ('cccccccc-cccc-4ccc-8ccc-cccccccc0001'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, '00000000-0000-4000-8000-000000000003'::uuid, '+1 — flights are where I actually have time to review.', '2025-11-13T08:00:00.000Z', '2025-11-13T08:00:00.000Z'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccc0002'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, '00000000-0000-4000-8000-000000000099'::uuid, 'On the roadmap for 1.2 — we''re prototyping a 50-card offline queue.', '2025-12-01T10:00:00.000Z', '2025-12-01T10:00:00.000Z'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccc0003'::uuid, '33333333-3333-4333-8333-333333333303'::uuid, '00000000-0000-4000-8000-000000000002'::uuid, 'Spanish in green and French in lavender would match my mental model.', '2026-01-20T11:00:00.000Z', '2026-01-20T11:00:00.000Z'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccc0004'::uuid, '33333333-3333-4333-8333-333333333305'::uuid, '00000000-0000-4000-8000-000000000099'::uuid, 'Shipped in 1.0.1 — thanks for the detailed iPad screenshots in the original request.', '2026-04-01T09:00:00.000Z', '2026-04-01T09:00:00.000Z'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccc0005'::uuid, '33333333-3333-4333-8333-333333333306'::uuid, '00000000-0000-4000-8000-000000000099'::uuid, 'Declining for now — we want to nail solo reading goals before adding social pressure.', '2025-11-30T15:00:00.000Z', '2025-11-30T15:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lingoleaf.blog_posts (id, created_by, title, summary, body, comment_count, created_at, updated_at)
VALUES
  ('44444444-4444-4444-8444-444444444401'::uuid, '00000000-0000-4000-8000-000000000099'::uuid, 'LingoLeaf 1.0 — read in any language', 'Public launch with tap-to-translate reading, study lists, and a calm garden that grows with your habits.', 'Today we''re launching LingoLeaf 1.0 on iOS.

**What''s included**
- EPUB reader with instant translation
- Highlight-to-study workflow
- Daily reading goals and garden progression
- Guest mode so you can try a chapter before signing in

We built LingoLeaf for learners who want to stay inside the book instead of bouncing between apps. Thank you to everyone who tested the TestFlight builds.', 3, '2025-08-15T10:00:00.000Z', '2025-08-15T10:00:00.000Z'),
  ('44444444-4444-4444-8444-444444444402'::uuid, '00000000-0000-4000-8000-000000000099'::uuid, 'Flashcards graduate from beta', 'Spaced repetition decks now respect your per-language lists and sync review history across devices.', 'Flashcards are out of beta in 1.0.1.

You can study from any vocab list, star tricky terms, and let the scheduler surface cards when you''re likely to forget them. Reviews sync through Supabase when signed in.

Known issue: StoreKit purchase sheet occasionally times out on slow networks — we''re tracking it in analytics.', 2, '2025-10-02T14:00:00.000Z', '2025-10-02T14:00:00.000Z'),
  ('44444444-4444-4444-8444-444444444403'::uuid, '00000000-0000-4000-8000-000000000099'::uuid, 'Garden mode tweaks', 'Streak bonuses are clearer, resting state copy is friendlier, and GP awards match your primary goal.', 'Garden mode received a polish pass based on forum feedback.

- Primary goal selection in onboarding
- Clearer copy when your tree is resting vs. dead
- Bonus GP when you complete all three daily goals

More community features are still on the backlog — we''re focused on solo reading depth first.', 1, '2026-01-20T09:00:00.000Z', '2026-01-20T09:00:00.000Z'),
  ('44444444-4444-4444-8444-444444444404'::uuid, '00000000-0000-4000-8000-000000000099'::uuid, 'iOS purchase reliability fix', '1.0.2 retries StoreKit timeouts and surfaces a clearer error when the App Store is unreachable.', 'Version 1.0.2 addresses the most common premium purchase failures we saw in analytics.

- Retry with exponential backoff before showing an error
- Offline detection before opening the purchase sheet
- Admin dashboard now tags `purchase_failed` events with error codes

If you still hit issues, email support with your install ID from Settings → About.', 2, '2026-06-01T16:00:00.000Z', '2026-06-01T16:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, body = EXCLUDED.body, comment_count = EXCLUDED.comment_count, updated_at = EXCLUDED.updated_at;

INSERT INTO lingoleaf.blog_comments (id, post_id, created_by, body, created_at, updated_at)
VALUES
  ('dddddddd-dddd-4ddd-8ddd-dddddddd0001'::uuid, '44444444-4444-4444-8444-444444444401'::uuid, '00000000-0000-4000-8000-000000000002'::uuid, 'Congrats! The garden metaphor sold me instantly.', '2025-08-16T08:00:00.000Z', '2025-08-16T08:00:00.000Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddd0002'::uuid, '44444444-4444-4444-8444-444444444401'::uuid, '00000000-0000-4000-8000-000000000003'::uuid, 'Guest mode is perfect for recommending to friends.', '2025-08-17T12:00:00.000Z', '2025-08-17T12:00:00.000Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddd0003'::uuid, '44444444-4444-4444-8444-444444444402'::uuid, '00000000-0000-4000-8000-000000000002'::uuid, 'Spaced repetition + highlights is the combo I wanted.', '2025-10-03T09:00:00.000Z', '2025-10-03T09:00:00.000Z'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddd0004'::uuid, '44444444-4444-4444-8444-444444444404'::uuid, '00000000-0000-4000-8000-000000000003'::uuid, 'Purchase worked on second try after this update.', '2026-06-02T07:00:00.000Z', '2026-06-02T07:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lingoleaf.analytics_events (event_name, event_version, user_id, install_id, app_version, platform, locale, metadata, created_at)
VALUES
  ('session_started', 1, '00000000-0000-4000-8000-000000000002'::uuid, 'install-ios-00', '1.0.2', 'ios', 'en-US', '{}'::jsonb, '2026-06-11T01:50:09.380Z'),
  ('session_started', 1, null, 'install-ios-01', '1.0.2', 'ios', 'en-US', '{}'::jsonb, '2026-06-11T01:49:09.380Z'),
  ('session_started', 1, '00000000-0000-4000-8000-000000000002'::uuid, 'install-ios-02', '1.0.2', 'ios', 'en-US', '{}'::jsonb, '2026-06-11T01:48:09.380Z'),
  ('book_opened', 1, '00000000-0000-4000-8000-000000000002'::uuid, 'install-ios-00', '1.0.2', 'ios', 'en-US', '{}'::jsonb, '2026-06-11T01:50:09.380Z'),
  ('book_opened', 1, null, 'install-ios-01', '1.0.2', 'ios', 'en-US', '{}'::jsonb, '2026-06-11T01:49:09.380Z'),
  ('book_opened', 1, '00000000-0000-4000-8000-000000000002'::uuid, 'install-ios-02', '1.0.2', 'ios', 'en-US', '{}'::jsonb, '2026-06-11T01:48:09.380Z'),
  ('translate_requested', 1, '00000000-0000-4000-8000-000000000002'::uuid, 'install-ios-00', '1.0.2', 'ios', 'en-US', '{}'::jsonb, '2026-06-11T01:50:09.380Z'),
  ('translate_requested', 1, null, 'install-ios-01', '1.0.2', 'ios', 'en-US', '{}'::jsonb, '2026-06-11T01:49:09.380Z'),
  ('translate_requested', 1, '00000000-0000-4000-8000-000000000002'::uuid, 'install-ios-02', '1.0.2', 'ios', 'en-US', '{}'::jsonb, '2026-06-11T01:48:09.380Z'),
  ('purchase_failed', 1, '00000000-0000-4000-8000-000000000002'::uuid, 'install-ios-10', '1.0.1', 'ios', 'en-US', '{}'::jsonb, '2026-06-10T01:50:09.380Z'),
  ('purchase_failed', 1, null, 'install-ios-11', '1.0.1', 'ios', 'en-US', '{}'::jsonb, '2026-06-10T01:49:09.380Z'),
  ('purchase_failed', 1, '00000000-0000-4000-8000-000000000002'::uuid, 'install-ios-12', '1.0.1', 'ios', 'en-US', '{}'::jsonb, '2026-06-10T01:48:09.380Z')
;

SET LOCAL session_replication_role = DEFAULT;
COMMIT;

