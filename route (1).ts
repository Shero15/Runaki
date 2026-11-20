import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin";
import { db } from "@/db";
import { records, zoneBlocks } from "@/db/schema";
import { ensureDbReady } from "@/lib/seed";
import { desc } from "drizzle-orm";

function formatSheetDate(raw?: string): string {
  if (!raw || !raw.trim()) {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
      d.getDate()
    ).padStart(2, "0")}/${d.getFullYear()}`;
  }
  const trimmed = raw.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  }
  return trimmed;
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }
    await ensureDbReady();
    const body = await request.json().catch(() => ({}));
    const rawItems = Array.isArray(body.items) ? body.items.slice(0, 2000) : [];

    const allRecs = await db.select().from(records).orderBy(desc(records.id));
    const allZb = await db
      .select()
      .from(zoneBlocks)
      .orderBy(desc(zoneBlocks.id));

    let matchedCount = 0;

    const resolvedRows = rawItems.map(
      (item: {
        query?: string;
        field?: string;
        date?: string;
        city?: string;
      }) => {
        const q = String(item.query ?? "").trim();
        const qLower = q.toLowerCase();
        const field = String(item.field ?? "auto").toLowerCase();
        const dateStr = formatSheetDate(item.date);
        const fallbackCity = String(item.city ?? "").trim();

        const rec = allRecs.find((r) => {
          if (field === "account") return r.account.toLowerCase() === qLower;
          if (field === "meter") return r.meter.toLowerCase() === qLower;
          if (field === "phone") return r.phone.toLowerCase() === qLower;
          return (
            r.account.toLowerCase() === qLower ||
            r.meter.toLowerCase() === qLower ||
            r.phone.toLowerCase() === qLower ||
            r.sts.toLowerCase() === qLower
          );
        });

        const zb = allZb.find((z) => {
          if (rec) {
            return (
              (rec.account &&
                z.account.toLowerCase() === rec.account.toLowerCase()) ||
              (rec.meter &&
                z.meter.toLowerCase() === rec.meter.toLowerCase()) ||
              (rec.phone && z.phone.toLowerCase() === rec.phone.toLowerCase())
            );
          }
          if (field === "account") return z.account.toLowerCase() === qLower;
          if (field === "meter") return z.meter.toLowerCase() === qLower;
          if (field === "phone") return z.phone.toLowerCase() === qLower;
          return (
            z.account.toLowerCase() === qLower ||
            z.meter.toLowerCase() === qLower ||
            z.phone.toLowerCase() === qLower
          );
        });

        const isMatched = Boolean(rec || zb);
        if (isMatched) matchedCount++;

        let unmatchedAccount = "";
        let unmatchedMeter = "";
        let unmatchedPhone = "";
        if (!isMatched) {
          if (field === "meter" || /^[a-z]/i.test(q)) {
            unmatchedMeter = q;
          } else if (field === "phone" || /^0?7\d{8,9}$/.test(q)) {
            unmatchedPhone = q;
          } else {
            unmatchedAccount = q;
          }
        }

        return {
          query: q,
          matched: isMatched,
          date: dateStr || rec?.date || "",
          account: rec?.account || zb?.account || unmatchedAccount,
          city: rec?.city || zb?.city || fallbackCity,
          meter: rec?.meter || zb?.meter || unmatchedMeter,
          phone: rec?.phone || zb?.phone || unmatchedPhone,
          zone: rec?.zone || zb?.zone || "",
          block: rec?.block || zb?.block || "",
          longitude: rec?.longitude || "",
          latitude: rec?.latitude || "",
          sts: rec?.sts || "",
        };
      }
    );

    return NextResponse.json({
      ok: true,
      rows: resolvedRows,
      matched: matchedCount,
    });
  } catch (err) {
    console.error("Field resolve error:", err);
    return NextResponse.json(
      { ok: false, error: "Resolve failed" },
      { status: 500 }
    );
  }
}
