# Secret audit (pre-public launch)

Run this checklist before making the repository public.

## Git history scan results

Manual scans performed on the repository:

```bash
git log --all --full-history -- .env .env.local .dev.vars
# Result: no commits touching env files

git log -S "re_" --all --oneline -- . ':!.test-dist'
# Result: only test placeholders and Resend integration code (no live keys)
```

**Finding:** No live API keys, `.env` files, or private keys were found in git history. Committed secrets risk is low, but rotation is still recommended as insurance.

## Rotate before going public

Complete these in the respective dashboards:

| Secret | Location | Action |
|--------|----------|--------|
| `RESEND_API_KEY` | Cloudflare Pages → Environment variables | Rotate in [Resend dashboard](https://resend.com/api-keys); update Production and Preview |
| `TURNSTILE_SECRET_KEY` | Cloudflare Pages → Environment variables | Rotate in Cloudflare Turnstile dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Cloudflare Pages + Supabase | Generate new key in Supabase → Settings → API; add to Cloudflare as encrypted env var (required after Turnstile lockdown migration) |

Do **not** rotate `VITE_SUPABASE_ANON_KEY` or `VITE_TURNSTILE_SITE_KEY` solely for open-sourcing — they are public by design.

## Dashboard verification

- [ ] Cloudflare Pages env vars are **encrypted** (not plain text in build logs)
- [ ] Turnstile widget domains restricted to `lingoleaf.app` and preview URLs
- [ ] Supabase RLS enabled on all public tables
- [ ] Service role key never set in client-side `VITE_*` variables
- [ ] Resend API key scoped to send-only if available

## Automated scanning

After pushing the public repo, enable GitHub **Secret scanning** and **Push protection** under Settings → Code security. CI runs gitleaks on every pull request (see `.github/workflows/ci.yml`).
