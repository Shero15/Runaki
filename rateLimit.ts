// Simple in-memory login throttle: 5 failed attempts per 15 minutes per IP.
// Per-instance only. If you run several server instances, also rate-limit at
// your reverse proxy / WAF (Cloudflare, nginx, etc.).
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failures = new Map<string, { count: number; first: number }>();

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "unknown").trim();
}

export function checkLoginAllowed(ip: string): { ok: boolean; retryAfter: number } {
  const entry = failures.get(ip);
  if (!entry) return { ok: true, retryAfter: 0 };
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(ip);
    return { ok: true, retryAfter: 0 };
  }
  if (entry.count >= MAX_FAILURES) {
    return { ok: false, retryAfter: Math.ceil((entry.first + WINDOW_MS - Date.now()) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

export function recordLoginFailure(ip: string) {
  const now = Date.now();
  const entry = failures.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) failures.set(ip, { count: 1, first: now });
  else entry.count += 1;
  if (failures.size > 10000) failures.clear();
}

export function clearLoginFailures(ip: string) {
  failures.delete(ip);
}
