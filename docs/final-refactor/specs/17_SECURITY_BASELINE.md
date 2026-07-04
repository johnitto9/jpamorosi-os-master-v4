# 17_SECURITY_BASELINE

## Objective

Implement a minimum viable security layer for a public AI portfolio with admin, uploads, Postgres, Docker, Cloudflare and Hostinger VPS.

## Cloudflare Edge

Review/require:
- SSL/TLS `Full (strict)`;
- managed WAF rules where plan supports;
- rate limiting for expensive/critical endpoints;
- abuse visibility;
- admin protection strategy.

Recommended:
- Cloudflare Access in front of `/admin/*` and sensitive admin routes where deployment allows;
- keep application auth as second layer.

## Origin exposure

Goal:
- prevent direct bypass of Cloudflare where practical.

Audit:
- VPS public IP;
- raw ports;
- reverse proxy;
- Cloudflare-only origin access;
- Authenticated Origin Pulls or Tunnel where justified.

Do not introduce Tunnel merely for fashion.

## Production Docker network

### Postgres
Production must not expose:
`5433:5432` publicly.

Preferred:
- no `ports` mapping;
- Docker internal network only.

If local debugging needs host access:
- bind to `127.0.0.1`.

### App ports
Audit:
- `3000`
- `3001`

Prefer:
- loopback/reverse proxy;
- internal network;
- only necessary public interfaces.

## Docker socket

Audit:
`/var/run/docker.sock`

Treat as highly sensitive.

Recommended:
- remove autoheal if unnecessary;
- otherwise document risk and use restricted socket proxy;
- pin images.

Do not assume `:ro` makes Docker socket harmless.

## VPS hardening

Minimum:
- default-deny inbound firewall;
- expose only required ports;
- SSH keys;
- disable password auth after verified key access;
- avoid direct root login;
- automatic security updates;
- Fail2Ban where useful;
- backups/snapshots;
- encrypted off-host DB dumps.

## Admin

Require:
- application auth;
- secure session cookies;
- `HttpOnly`;
- `Secure`;
- appropriate `SameSite`;
- expiry/rotation;
- CSRF/origin validation on mutations;
- rate limiting;
- Access layer where practical.

## Uploads

Server-side:
- size limits;
- MIME allowlist;
- inspect/decode actual image;
- random storage names;
- no arbitrary SVG by default;
- strip metadata where appropriate;
- never execute uploads.

## LLM boundary

Public model context must never include:
- env vars;
- tokens;
- cookies;
- secrets;
- unnecessary raw admin data.

Keep:
- server-side auth;
- tool whitelist;
- schema validation;
- explicit tool authorization.

Security must not depend on model obedience.

## Internal/Cron APIs

Require:
- strong internal token;
- rate limit;
- network restriction where practical;
- no accidental browser/public use.

Verify heartbeat scheduling actually exists.

## Health endpoint

Public response should be minimal:
`{"ok": true}`

Detailed dependency state belongs behind protection.

## Backups

Minimum:
- snapshot before major deploy;
- daily Postgres dump;
- encrypted off-VPS copy;
- periodic restore test.

## Acceptance

- no public Postgres port;
- no unnecessary raw backend port;
- admin defense in depth;
- uploads validated;
- internal APIs protected;
- secrets absent from LLM context;
- restore procedure documented.
