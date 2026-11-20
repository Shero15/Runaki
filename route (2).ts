import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, sessionCookieOptions } from "@/lib/admin";

export async function POST() {
  const res = NextResponse.json({ ok: true, admin: false });
  res.cookies.set(ADMIN_COOKIE_NAME, "", sessionCookieOptions(0));
  return res;
}
