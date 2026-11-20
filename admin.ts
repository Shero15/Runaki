import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "runaki_session";
export type Role = "admin" | "staff";

const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET is required and must be at least 32 characters.");
  }
  return s;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Constant-time string comparison (hashes first so lengths never leak). */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

/** Returns the role matching the password, or null. No default passwords exist. */
export function verifyPassword(input: string): Role | null {
  const candidate = (input ?? "").trim();
  if (!candidate) return null;
  const adminPw = process.env.ADMIN_PASSWORD?.trim();
  const staffPw = process.env.STAFF_PASSWORD?.trim();
  if (adminPw && safeEqual(candidate, adminPw)) return "admin";
  if (staffPw && safeEqual(candidate, staffPw)) return "staff";
  return null;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(role: Role): string {
  const payload = Buffer.from(
    JSON.stringify({
      r: role,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      n: randomBytes(12).toString("base64url"),
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): Role | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return data.r === "admin" || data.r === "staff" ? data.r : null;
  } catch {
    return null;
  }
}

export async function getSessionRole(): Promise<Role | null> {
  try {
    const store = await cookies();
    return readSessionToken(store.get(ADMIN_COOKIE_NAME)?.value);
  } catch {
    return null;
  }
}

/** Any signed-in user (staff or admin). */
export async function isAuthenticated(): Promise<boolean> {
  return (await getSessionRole()) !== null;
}

/** Admin only. */
export async function isAdminAuthenticated(): Promise<boolean> {
  return (await getSessionRole()) === "admin";
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}
