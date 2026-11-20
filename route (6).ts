import { NextResponse } from "next/server";
import { db } from "@/db";
import { records } from "@/db/schema";
import { ensureDbReady } from "@/lib/seed";
import { isAdminAuthenticated } from "@/lib/admin";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { ok: false, error: "Admin access required." },
        { status: 401 }
      );
    }
    await ensureDbReady();
    const { id } = await context.params;
    const recordId = Number(id);
    if (!Number.isFinite(recordId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid ID" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
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

    const [updated] = await db
      .update(records)
      .set({
        dataset: body.dataset === "linking" ? "linking" : "records",
        date: String(body.date ?? "").trim(),
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
        updatedAt: new Date(),
      })
      .where(eq(records.id, recordId))
      .returning();

    return NextResponse.json({ ok: true, record: updated });
  } catch (err) {
    console.error("Update record error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not update the record." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { ok: false, error: "Admin access required." },
        { status: 401 }
      );
    }
    await ensureDbReady();
    const { id } = await context.params;
    const recordId = Number(id);
    if (!Number.isFinite(recordId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid ID" },
        { status: 400 }
      );
    }

    await db.delete(records).where(eq(records.id, recordId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete record error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not delete the record." },
      { status: 500 }
    );
  }
}
