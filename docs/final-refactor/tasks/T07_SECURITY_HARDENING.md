# T07_SECURITY_HARDENING

## Objective
Implement minimum security baseline without destabilizing deployment.

## Read first
- `specs/17_SECURITY_BASELINE.md`

## Do
1. Audit Cloudflare mode/WAF/rate limits.
2. Plan/implement admin Access where viable.
3. Audit origin bypass.
4. Remove public Postgres exposure in production.
5. Restrict raw app/backend ports.
6. Audit Docker socket/autoheal.
7. Harden VPS firewall/SSH/updates.
8. Validate uploads.
9. Audit LLM context boundaries.
10. Protect internal/cron routes.
11. Minimize public health response.
12. Document backup/restore.

## Safety
Before auth/network changes:
- verify current access path;
- preserve rollback;
- do not lock out admin.

## Tests
- auth;
- rate limit;
- upload abuse;
- internal endpoint auth;
- admin cookie review.

## Stop
Report exact changes, risks and rollback.
