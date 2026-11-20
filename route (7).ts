import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin";
import { db } from "@/db";
import { records, zoneBlocks, RecordRow } from "@/db/schema";
import { ensureDbReady } from "@/lib/seed";
import { and, count, desc, eq, ilike, or, SQL } from "drizzle-orm";

async function enrichRowsWithZoneBlocks(rows: RecordRow[]): Promise<RecordRow[]> {
  if (rows.length === 0) return rows;
  const needsEnrich = rows.some((r) => !r.zone || !r.block || !r.city);
  if (!needsEnrich) return rows;

  const allZb = await db.select().from(zoneBlocks).limit(5000);
  if (allZb.length === 0) return rows;

  const byAccount = new Map<string, (typeof allZb)[number]>();
  const byMeter = new Map<string, (typeof allZb)[number]>();
  const byPhone = new Map<string, (typeof allZb)[number]>();

  for (const zb of allZb) {
    if (zb.account) byAccount.set(zb.account.toLowerCase(), zb);
    if (zb.meter) byMeter.set(zb.meter.toLowerCase(), zb);
    if (zb.phone) byPhone.set(zb.phone.toLowerCase(), zb);
  }

  return rows.map((r) => {
    const zb =
      (r.account && byAccount.get(r.account.toLowerCase())) ||
      (r.meter && byMeter.get(r.meter.toLowerCase())) ||
      (r.phone && byPhone.get(r.phone.toLowerCase()));
    if (!zb) return r;
    return {
      ...r,
      zone: r.zone || zb.zone,
      block: r.block || zb.block,
      city: r.city || zb.city,
    };
  });
}

export async function POST(request: Request) {
  const start = Date.now();
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }
    await ensureDbReady();
    const body = await request.json().catch(() => ({}));

    // Bulk mode
    if (Array.isArray(body.queries)) {
      const rawQueries: string[] = body.queries
        .map((q: unknown) => String(q ?? "").trim())
        .filter(Boolean)
        .slice(0, 2000);

      if (rawQueries.length === 0) {
        return NextResponse.json({
          ok: true,
          mode: "bulk",
          groups: [],
          total: 0,
          ms: Date.now() - start,
        });
      }

      const allRecords = await db
        .select()
        .from(records)
        .orderBy(desc(records.id));
      const enriched = await enrichRowsWithZoneBlocks(allRecords);

      let totalMatchedRows = 0;
      const groups = rawQueries.map((query) => {
        const qLower = query.toLowerCase();
        // Exact match first on meter, account, phone, sts, block
        let matched = enriched.filter(
          (r) =>
            r.meter.toLowerCase() === qLower ||
            r.account.toLowerCase() === qLower ||
            r.phone.toLowerCase() === qLower ||
            r.sts.toLowerCase() === qLower ||
            r.block.toLowerCase() === qLower
        );
        if (matched.length === 0) {
          matched = enriched.filter(
            (r) =>
              r.meter.toLowerCase().includes(qLower) ||
              r.account.toLowerCase().includes(qLower) ||
              r.phone.toLowerCase().includes(qLower) ||
              r.sts.toLowerCase().includes(qLower)
          );
        }
        totalMatchedRows += matched.length;
        return { query, rows: matched };
      });

      return NextResponse.json({
        ok: true,
        mode: "bulk",
        groups,
        total: totalMatchedRows,
        ms: Math.max(1, Date.now() - start),
      });
    }

    // Single / filtered search mode
    const q = String(body.q ?? "").trim();
    const field = String(body.field ?? "any").trim();
    const dataset = String(body.dataset ?? "all").trim();
    const zoneFilter = String(body.zone ?? "").trim();
    const cityFilter = String(body.city ?? "").trim();
    const blockFilter = String(body.block ?? "").trim();
    const page = Math.max(1, Number(body.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(body.pageSize) || 25));

    const conditions: SQL[] = [];

    if (dataset && dataset !== "all") {
      conditions.push(eq(records.dataset, dataset));
    }
    if (zoneFilter && zoneFilter !== "all") {
      conditions.push(ilike(records.zone, zoneFilter));
    }
    if (cityFilter && cityFilter !== "all") {
      conditions.push(ilike(records.city, cityFilter));
    }
    if (blockFilter) {
      conditions.push(ilike(records.block, `%${blockFilter}%`));
    }

    if (q && q !== "*") {
      const pattern = `%${q}%`;
      if (field === "account") {
        conditions.push(ilike(records.account, pattern));
      } else if (field === "meter") {
        conditions.push(ilike(records.meter, pattern));
      } else if (field === "phone") {
        conditions.push(ilike(records.phone, pattern));
      } else if (field === "zone") {
        conditions.push(ilike(records.zone, pattern));
      } else if (field === "block") {
        conditions.push(ilike(records.block, pattern));
      } else if (field === "sts") {
        conditions.push(ilike(records.sts, pattern));
      } else {
        const orCond = or(
          ilike(records.account, pattern),
          ilike(records.meter, pattern),
          ilike(records.phone, pattern),
          ilike(records.zone, pattern),
          ilike(records.block, pattern),
          ilike(records.sts, pattern),
          ilike(records.city, pattern)
        );
        if (orCond) conditions.push(orCond);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(records)
      .where(whereClause);

    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pages);
    const offset = (safePage - 1) * pageSize;

    const rawRows = await db
      .select()
      .from(records)
      .where(whereClause)
      .orderBy(desc(records.id))
      .limit(pageSize)
      .offset(offset);

    const rows = await enrichRowsWithZoneBlocks(rawRows);

    return NextResponse.json({
      ok: true,
      mode: "single",
      rows,
      total,
      page: safePage,
      pageSize,
      pages,
      ms: Math.max(1, Date.now() - start),
    });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { ok: false, error: "Search failed" },
      { status: 500 }
    );
  }
}
