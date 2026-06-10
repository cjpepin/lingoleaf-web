# Security Policy

## Reporting a vulnerability

If you discover a security issue in this repository or the live site at [lingoleaf.app](https://lingoleaf.app), please report it responsibly.

**Email:** [support@lingoleaf.app](mailto:support@lingoleaf.app)  
**Subject:** `[Security] LingoLeaf web`

Please include:

- A description of the issue and its potential impact
- Steps to reproduce
- Any proof-of-concept code or screenshots (if applicable)

We aim to acknowledge reports within **48 hours** and will work with you on a reasonable disclosure timeline.

Please do **not** open public GitHub issues for undisclosed security vulnerabilities.

## Scope

In scope:

- This repository (`lingoleaf-web`) and its Cloudflare Pages deployment
- Supabase-backed community features (Feature Forum, App Updates, admin analytics API)
- Cloudflare Pages Functions under `/lingoleaf/api/`

Out of scope:

- The LingoLeaf iOS mobile app (separate codebase)
- Third-party services (Supabase, Cloudflare, Resend) except where misconfiguration in this project enables abuse

## Security model

- Client-side code uses the Supabase **anon** key only; row-level security enforces access control.
- Server-side secrets (`RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) live in Cloudflare Pages environment variables and are never committed to git.
- Human verification (Turnstile) is enforced server-side; direct client RPC calls to verification functions are blocked.
- Admin analytics and moderation require forum admin membership verified in the database.

## Supported versions

Security fixes are applied to the `main` branch of this repository. There are no long-term release branches.
