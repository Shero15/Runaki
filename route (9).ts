import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  records,
  zoneBlocks,
  importLogs,
  NewRecordRow,
  NewZoneBlockRow,
} from "@/db/schema";
import { ensureDbReady } from "@/lib/seed";
import { isAdminAuthenticated } from "@/lib/admin";
import {
  mapCsvRows,
  parseCsv,
  RECORD_HEADER_ALIASES,
  ZONE_HEADER_ALIASES,
} from "@/lib/csv";

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { ok: false, error: "Admin access required." },
        { status: 401 }
      );
    }
    await ensureDbReady();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const target = String(formData.get("target") ?? "records"); // "records" | "zone"
    const mode = String(formData.get("mode") ?? "append"); // "append" | "replace"

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No CSV file provided." },
        { status: 400 }
      );
    }

    const text = await file.text();
    const rawRows = parseCsv(text);
    if (rawRows.length < 2) {
      return NextResponse.json(
        { ok: false, error: "CSV file has no data rows." },
        { status: 400 }
      );
    }

    if (target === "zone") {
      const { items, matched } = mapCsvRows(rawRows, ZONE_HEADER_ALIASES);
      if (matched.length === 0) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No recognizable Zone & Block columns found. Expected: Customer Account, Meter, Phone Number, City, Zone, Block Number.",
          },
          { status: 400 }
        );
      }

      const toInsert: NewZoneBlockRow[] = [];
      let skipped = 0;

      for (const item of items) {
        const account = (item.account ?? "").trim();
        const meter = (item.meter ?? "").trim();
        const phone = (item.phone ?? "").trim();
        const city = (item.city ?? "").trim();
        const zone = (item.zone ?? "").trim();
        const block = (item.block ?? "").trim();

        if (!account && !meter && !phone && !zone && !block) {
          skipped++;
          continue;
        }
        toInsert.push({ account, meter, phone, city, zone, block });
      }

      if (mode === "replace") {
        await db.delete(zoneBlocks);
      }

      const batchSize = 500;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        await db.insert(zoneBlocks).values(toInsert.slice(i, i + batchSize));
      }

      await db.insert(importLogs).values({
        target: "zone",
        mode,
        inserted: toInsert.length,
        skipped,
      });

      return NextResponse.json({
        ok: true,
        inserted: toInsert.length,
        skipped,
      });
    } else {
      const { items, matched } = mapCsvRows(rawRows, RECORD_HEADER_ALIASES);
      if (matched.length === 0) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No recognizable Customer Extraction columns found. Expected: Date, Customer Account, City, Meter, Phone Number, Zone, Block Number, Longitude, Latitude, STS number.",
          },
          { status: 400 }
        );
      }

      const toInsert: NewRecordRow[] = [];
      let skipped = 0;

      for (const item of items) {
        const account = (item.account ?? "").trim();
        const meter = (item.meter ?? "").trim();
        const phone = (item.phone ?? "").trim();
        const sts = (item.sts ?? "").trim();

        if (!account && !meter && !phone && !sts) {
          skipped++;
          continue;
        }

        toInsert.push({
          dataset: "records",
          date:
            (item.date ?? "").trim() || new Date().toISOString().slice(0, 10),
          account,
          city: (item.city ?? "").trim(),
          meter,
          phone,
          zone: (item.zone ?? "").trim(),
          block: (item.block ?? "").trim(),
          longitude: (item.longitude ?? "").trim(),
          latitude: (item.latitude ?? "").trim(),
          sts,
          notes: (item.notes ?? "").trim(),
        });
      }

      if (mode === "replace") {
        await db.delete(records);
      }

      const batchSize = 500;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        await db.insert(records).values(toInsert.slice(i, i + batchSize));
      }

      await db.insert(importLogs).values({
        target: "records",
        mode,
        inserted: toInsert.length,
        skipped,
      });

      return NextResponse.json({
        ok: true,
        inserted: toInsert.length,
        skipped,
      });
    }
  } catch (err) {
    console.error("CSV import error:", err);
    return NextResponse.json(
      { ok: false, error: "CSV import failed." },
      { status: 500 }
    );
  }
}
