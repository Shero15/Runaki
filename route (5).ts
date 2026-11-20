import { NextResponse } from "next/server";
import { db } from "@/db";
import { records, zoneBlocks, importLogs } from "@/db/schema";
import { ensureDbReady, seedSampleRegistry } from "@/lib/seed";
import { isAdminAuthenticated } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { ok: false, error: "Admin access required." },
        { status: 401 }
      );
    }
    await ensureDbReady();
    const body = await request.json().catch(() => ({}));

    if (body.action === "seed") {
      const result = await seedSampleRegistry();
      return NextResponse.json({ ok: true, ...result });
    }

    const account = String(body.account ?? "").trim();
    const meter = String(body.meter ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const sts = String(body.sts ?? "").trim();

    if (!account && !meter && !phone && !sts) {
      return NextResponse.json(
        {
          ok: false,
          error: "Enter at least an account, meter, phone or STS number.",
        },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(records)
      .values({
        dataset: body.dataset === "linking" ? "linking" : "records",
        date:
          String(body.date ?? "").trim() ||
          new Date().toISOString().slice(0, 10),
        account,
        city: String(body.city ?? "").trim(),
        meter,
        phone,
        zone: String(body.zone ?? "").trim(),
        block: String(body.block ?? "").trim(),
        longitude: String(body.longitude ?? "").trim(),
        latitude: String(body.latitude ?? "").trim(),
        sts,
        notes: String(body.notes ?? "").trim(),
      })
      .returning();

    return NextResponse.json({ ok: true, record: inserted });
  } catch (err) {
    console.error("Create record error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not save the record." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { ok: false, error: "Admin access required." },
        { status: 401 }
      );
    }
    await ensureDbReady();
    const { searchParams } = new URL(request.url);
    const dataset = searchParams.get("dataset") ?? "records";

    if (dataset === "zone_blocks") {
      await db.delete(zoneBlocks);
      await db.insert(importLogs).values({
        target: "zone",
        mode: "replace",
        inserted: 0,
        skipped: 0,
      });
    } else {
      await db.delete(records);
      await db.insert(importLogs).values({
        target: "records",
        mode: "replace",
        inserted: 0,
        skipped: 0,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Clear dataset error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not clear registry." },
      { status: 500 }
    );
  }
}
