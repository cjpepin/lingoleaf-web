# Production deployment checklist

Complete these steps after merging security hardening changes and **before** making the repository public.

## 1. Rotate secrets

Follow [SECRET_AUDIT.md](SECRET_AUDIT.md):

- [ ] Rotate `RESEND_API_KEY` in Resend; update Cloudflare Pages (Production + Preview)
- [ ] Rotate `TURNSTILE_SECRET_KEY` in Cloudflare Turnstile dashboard
- [ ] Add or rotate `SUPABASE_SERVICE_ROLE_KEY` in Cloudflare Pages (encrypted, server-only)

## 2. Apply Supabase migrations

Run new migrations against production in order:

1. `202603200001_turnstile_rpc_lockdown.sql`
2. `202603200002_analytics_admin_rpcs.sql`

If `analytics_events` already exists in production, the migration uses `create table if not exists` and `create or replace function` — safe to re-run.

Verify in Supabase SQL editor:

```sql
-- Should fail for authenticated users (403/401):
select public.mark_forum_human_verified_for_user(auth.uid());

-- Old function should be gone:
select public.mark_forum_human_verified();
```

## 3. Deploy to Cloudflare Pages

Ensure these env vars are set for **Production** and **Preview**:

| Variable | Encrypted |
|----------|-----------|
| `VITE_SUPABASE_URL` | No (build-time) |
| `VITE_SUPABASE_ANON_KEY` | No (build-time) |
| `VITE_TURNSTILE_SITE_KEY` | No (build-time) |
| `SUPABASE_URL` | Yes |
| `SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `TURNSTILE_SECRET_KEY` | Yes |
| `RESEND_API_KEY` | Yes |

Trigger a production deploy after env vars are updated.

## 4. Smoke tests

After deploy, verify on [lingoleaf.app](https://lingoleaf.app):

- [ ] Landing page loads
- [ ] Sign in (email or OAuth) works
- [ ] Feature Forum: Turnstile challenge appears for posting; post succeeds after verification
- [ ] Contact form sends email
- [ ] Admin analytics dashboard loads for a forum admin account
- [ ] Direct RPC bypass blocked: authenticated REST call to `mark_forum_human_verified_for_user` returns 401/403

## 5. Local verification (pre-deploy)

```sh
npm ci
npm run lint
npm test
npm run build
```

All commands must pass before deploying.
