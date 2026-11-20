# RUNAKI Registry: Secure Deployment Guide

## 1. Environment variables (required)
Set these on your host. Never put them in the code or commit them.

| Variable | Purpose |
|---|---|
| DATABASE_URL | PostgreSQL connection string (use sslmode=require) |
| SESSION_SECRET | 32+ random chars: openssl rand -base64 48 |
| ADMIN_PASSWORD | Full access (import / edit / delete). Long and unique |
| STAFF_PASSWORD | Read-only access (search + field sheets). Different from admin |

The app refuses to create sessions without SESSION_SECRET, and there is no default password.

## 2. Deploy (any one)
- Railway / Render / Fly.io: connect a PRIVATE Git repo, add a PostgreSQL service, set the 4 variables. Build: npm run build, start: npm start.
- Own server / government cloud: docker build -t runaki . then docker run -p 3000:3000 --env-file .env runaki, behind nginx or Caddy with HTTPS.
- Tables are created automatically on first request.

## 3. Before going live
- Use your own domain, HTTPS only (HSTS is already sent).
- Keep the Git repository private.
- Add your logo at public/brand/runaki-logo.png (it was not in the zip).
- Enable daily automatic database backups.
- Add rate limiting at the proxy/WAF (e.g. Cloudflare) on top of the built-in login lockout.
- Do not use "Load sample data" on the production database.
- Change passwords whenever someone leaves the team.
- Ask the client's IT/security team for a penetration test before real data is loaded.

## 4. What was fixed
- All data endpoints now require login (they were public).
- Hardcoded default admin password removed.
- Signed, expiring (8h) session tokens replace the fixed cookie; strict, secure, httpOnly.
- Two roles: staff (read) and admin (manage).
- Login lockout: 5 failures / 15 min / IP, constant-time password check.
- Security headers: HSTS, CSP, X-Frame-Options, nosniff, Permissions-Policy.
- Source maps and X-Powered-By disabled; search engines blocked (noindex).
- Template names removed; DB credentials no longer hardcoded.
