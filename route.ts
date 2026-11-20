import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin";
import { db } from "@/db";
import { records, zoneBlocks, importLogs } from "@/db/schema";
import { ensureDbReady } from "@/lib/seed";
import { count, desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }
    await ensureDbReady();

    const [{ value: mainCount }] = await db
      .select({ value: count() })
      .from(records)
      .where(eq(records.dataset, "records"));

    const [{ value: linkingCount }] = await db
      .select({ value: count() })
      .from(records)
      .where(eq(records.dataset, "linking"));

    const [{ value: zbCount }] = await db
      .select({ value: count() })
      .from(zoneBlocks);

    const allRecs = await db
      .select({
        account: records.account,
        meter: records.meter,
        zone: records.zone,
        city: records.city,
        date: records.date,
      })
      .from(records)
      .orderBy(desc(records.id))
      .limit(500);

    const zones = Array.from(
      new Set(allRecs.map((r) => r.zone.trim()).filter(Boolean))
    ).sort();

    const cities = Array.from(
      new Set(allRecs.map((r) => r.city.trim()).filter(Boolean))
    ).sort();

    const sampleAccounts = Array.from(
      new Set(
        allRecs
          .map((r) => r.account.trim() || r.meter.trim())
          .filter(Boolean)
      )
    ).slice(0, 6);

    const latestLogs = await db
      .select()
      .from(importLogs)
      .orderBy(desc(importLogs.id))
      .limit(1);

    const dataAsOf =
      allRecs.find((r) => r.date.trim())?.date.trim() ??
      (latestLogs[0]?.createdAt
        ? latestLogs[0].createdAt.toISOString().slice(0, 10)
        : null);

    return NextResponse.json({
      ok: true,
      totals: {
        records: mainCount,
        linking: linkingCount,
        zoneBlocks: zbCount,
        all: mainCount + linkingCount,
      },
      zones,
      cities,
      dataAsOf,
      lastImport: latestLogs[0]?.createdAt?.toISOString() ?? null,
      sampleAccounts:
        sampleAccounts.length > 0
          ? sampleAccounts
          : [
              "6312345678",
              "6301234567",
              "EA1409895",
              "6200000001",
              "6300000002",
            ],
    });
  } catch (err) {
    console.error("Catalog error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load catalog" },
      { status: 500 }
    );
  }
}
