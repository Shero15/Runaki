import { NextResponse } from "next/server";
import { createSessionToken, ADMIN_COOKIE_NAME, sessionCookieOptions, verifyPassword } from "@/lib/admin";
import { checkLoginAllowed, clearLoginFailures, clientIp, recordLoginFailure } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const gate = checkLoginAllowed(ip);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }
  try {
    const body = await request.json().catch(() => ({}));
    const role = verifyPassword(String(body.password ?? "").slice(0, 200));
    if (!role) {
      recordLoginFailure(ip);
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
    }
    clearLoginFailures(ip);
    const res = NextResponse.json({ ok: true, role, admin: role === "admin" });
    res.cookies.set(ADMIN_COOKIE_NAME, createSessionToken(role), sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Login failed." }, { status: 500 });
  }
}
