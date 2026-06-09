# Cloudflare WAF Rate Limits for Feature Forum

Configure these in Cloudflare Dashboard:

1. Go to **Security -> WAF -> Rate limiting rules**
2. Create the following rules for your zone.

## Rule 1: Burst protection for feature pages
- Expression:
  - `(http.request.uri.path starts_with "/features")`
- Counting characteristics:
  - `IP`
- Threshold:
  - `120 requests` per `1 minute`
- Action:
  - `Managed Challenge`
- Mitigation timeout:
  - `10 minutes`

## Rule 2: Tight burst protection for API abuse (Turnstile verify)
- Expression:
  - `(http.request.uri.path eq "/api/turnstile-verify")`
- Counting characteristics:
  - `IP`
- Threshold:
  - `30 requests` per `1 minute`
- Action:
  - `Block`
- Mitigation timeout:
  - `15 minutes`

## Rule 3: Optional stricter authenticated feature traffic
- Expression:
  - `(http.request.uri.path starts_with "/features" and http.user_agent ne "")`
- Counting characteristics:
  - `IP + User-Agent`
- Threshold:
  - `300 requests` per `5 minutes`
- Action:
  - `Managed Challenge`
- Mitigation timeout:
  - `15 minutes`

## Notes
- Keep API + DB limits in place even with WAF rules.
- Start with challenge mode, monitor false positives, then tighten.
