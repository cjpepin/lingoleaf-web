# Turnstile + Supabase Setup

This project uses a server-verified Turnstile flow:

- Cloudflare Function verifies the Turnstile challenge.
- Function validates the user's session JWT.
- Function calls Supabase RPC `mark_forum_human_verified_for_user()` using the **service role key** (server-only).
- Direct RPC calls from authenticated clients are blocked.

## 1) Run Supabase migrations

Run these migrations in order:

1. `202602240001_feature_forum.sql`
2. `202602240002_admin_user_email_lookup.sql`
3. `202602240003_forum_abuse_controls.sql`
4. `202602240004_forum_reports_and_audit.sql`
5. `202602240005_turnstile_rpc_no_service_role.sql`
6. `202603200001_turnstile_rpc_lockdown.sql`
7. `202603200002_analytics_admin_rpcs.sql`
8. Remaining blog/moderation migrations in chronological order

## 2) Cloudflare Pages environment variables

Set these in **Workers & Pages → your project → Settings → Environment variables**:

Client-exposed (for frontend build):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TURNSTILE_SITE_KEY`

Server-only (used by Functions):

- `TURNSTILE_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — used only by `/api/turnstile-verify` after Turnstile passes; never expose to the client

## 3) Turnstile dashboard

In Cloudflare Turnstile dashboard:

- Create widget and copy site key + secret key.
- Add allowed domains for your app.

## 4) Redeploy

Redeploy Cloudflare Pages so new env vars and migrations are active.
