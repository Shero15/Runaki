import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const role = await getSessionRole();
  return NextResponse.json({ ok: true, authenticated: role !== null, role, admin: role === "admin" });
}
