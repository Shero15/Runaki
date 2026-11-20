import { db, pool } from "@/db";
import { records, zoneBlocks, importLogs, NewRecordRow, NewZoneBlockRow } from "@/db/schema";
import { count } from "drizzle-orm";

export const SAMPLE_RECORDS: NewRecordRow[] = [
  {
    dataset: "records",
    date: "2026-11-19",
    account: "6312345678",
    city: "Erbil",
    meter: "EA1409895",
    phone: "07501234567",
    zone: "ER-12",
    block: "B-104",
    longitude: "44.0089",
    latitude: "36.1911",
    sts: "01234567890",
    notes: "Primary 3-phase smart meter — Ankawa feeder A2, verified by PMO team.",
  },
  {
    dataset: "records",
    date: "2026-11-19",
    account: "6301234567",
    city: "Erbil",
    meter: "EA1412262",
    phone: "07504458821",
    zone: "ER-12",
    block: "B-108",
    longitude: "44.0142",
    latitude: "36.1955",
    sts: "43038531201",
    notes: "Residential smart meter — Empire World sector.",
  },
  {
    dataset: "records",
    date: "2026-11-19",
    account: "6309876543",
    city: "Erbil",
    meter: "EE0084207",
    phone: "07503119044",
    zone: "ER-08",
    block: "B-215",
    longitude: "44.0221",
    latitude: "36.1840",
    sts: "43038531202",
    notes: "Commercial unit — 100m Street transformer T-14.",
  },
  {
    dataset: "records",
    date: "2026-11-19",
    account: "63453275667",
    city: "Erbil",
    meter: "EA1520463",
    phone: "07504538916",
    zone: "ER-15",
    block: "ER2453",
    longitude: "44.0318",
    latitude: "36.2014",
    sts: "43038531208",
    notes: "Runaki continuous power program — Dream City block ER2453.",
  },
  {
    dataset: "records",
    date: "2026-11-19",
    account: "6200000001",
    city: "Erbil",
    meter: "EA1488101",
    phone: "07507712001",
    zone: "ER-04",
    block: "B-041",
    longitude: "43.9984",
    latitude: "36.1889",
    sts: "43038531901",
    notes: "Bakhtiari neighborhood — optical reading verified.",
  },
  {
    dataset: "records",
    date: "2026-11-19",
    account: "6300000002",
    city: "Sulaymaniyah",
    meter: "SU2209412",
    phone: "07701425502",
    zone: "SU-07",
    block: "S-302",
    longitude: "45.4329",
    latitude: "35.5613",
    sts: "43039910202",
    notes: "Salim Street distribution feeder S7 — Runaki Phase 2.",
  },
  {
    dataset: "records",
    date: "2026-11-19",
    account: "6400000003",
    city: "Duhok",
    meter: "DU3104885",
    phone: "07508823103",
    zone: "DU-03",
    block: "D-118",
    longitude: "42.9884",
    latitude: "36.8671",
    sts: "43041100303",
    notes: "Masike sector — smart STS keypad active.",
  },
  {
    dataset: "records",
    date: "2026-11-19",
    account: "6500000004",
    city: "Erbil",
    meter: "EA1495330",
    phone: "07506194404",
    zone: "ER-19",
    block: "B-410",
    longitude: "44.0491",
    latitude: "36.2145",
    sts: "43038531904",
    notes: "Mass City feeder — verified GPS coordinates.",
  },
  {
    dataset: "records",
    date: "2026-11-19",
    account: "7000000005",
    city: "Halabja",
    meter: "HA4011290",
    phone: "07705129005",
    zone: "HA-02",
    block: "H-019",
    longitude: "45.9861",
    latitude: "35.1778",
    sts: "43045500505",
    notes: "Central Halabja residential distribution box #19.",
  },
  {
    dataset: "linking",
    date: "2026-11-18",
    account: "6388120944",
    city: "Erbil",
    meter: "EF0001890",
    phone: "07509182233",
    zone: "ER-15",
    block: "ER2453",
    longitude: "44.0325",
    latitude: "36.2020",
    sts: "43038539910",
    notes: "Field linking record — enclosure seal replaced.",
  },
  {
    dataset: "records",
    date: "2026-11-18",
    account: "6319904112",
    city: "Sulaymaniyah",
    meter: "SU2214809",
    phone: "07703948112",
    zone: "SU-11",
    block: "S-514",
    longitude: "45.4182",
    latitude: "35.5701",
    sts: "43039910884",
    notes: "Raparin district — single-phase STS meter.",
  },
  {
    dataset: "records",
    date: "2026-11-18",
    account: "6411209876",
    city: "Duhok",
    meter: "DU3190042",
    phone: "07507210944",
    zone: "DU-09",
    block: "D-209",
    longitude: "43.0012",
    latitude: "36.8594",
    sts: "43041100988",
    notes: "Kro sector — meter communication online.",
  },
];

export const SAMPLE_ZONE_BLOCKS: NewZoneBlockRow[] = [
  {
    account: "6312345678",
    meter: "EA1409895",
    phone: "07501234567",
    city: "Erbil",
    zone: "ER-12",
    block: "B-104",
  },
  {
    account: "6301234567",
    meter: "EA1412262",
    phone: "07504458821",
    city: "Erbil",
    zone: "ER-12",
    block: "B-108",
  },
  {
    account: "6309876543",
    meter: "EE0084207",
    phone: "07503119044",
    city: "Erbil",
    zone: "ER-08",
    block: "B-215",
  },
  {
    account: "63453275667",
    meter: "EA1520463",
    phone: "07504538916",
    city: "Erbil",
    zone: "ER-15",
    block: "ER2453",
  },
  {
    account: "6200000001",
    meter: "EA1488101",
    phone: "07507712001",
    city: "Erbil",
    zone: "ER-04",
    block: "B-041",
  },
  {
    account: "6300000002",
    meter: "SU2209412",
    phone: "07701425502",
    city: "Sulaymaniyah",
    zone: "SU-07",
    block: "S-302",
  },
  {
    account: "6400000003",
    meter: "DU3104885",
    phone: "07508823103",
    city: "Duhok",
    zone: "DU-03",
    block: "D-118",
  },
  {
    account: "6500000004",
    meter: "EA1495330",
    phone: "07506194404",
    city: "Erbil",
    zone: "ER-19",
    block: "B-410",
  },
  {
    account: "7000000005",
    meter: "HA4011290",
    phone: "07705129005",
    city: "Halabja",
    zone: "HA-02",
    block: "H-019",
  },
];

let initialized = false;

export async function ensureDbReady(): Promise<void> {
  if (initialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      id SERIAL PRIMARY KEY,
      dataset TEXT NOT NULL DEFAULT 'records',
      date TEXT NOT NULL DEFAULT '',
      account TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      meter TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      zone TEXT NOT NULL DEFAULT '',
      block TEXT NOT NULL DEFAULT '',
      longitude TEXT NOT NULL DEFAULT '',
      latitude TEXT NOT NULL DEFAULT '',
      sts TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS records_account_idx ON records (account);
    CREATE INDEX IF NOT EXISTS records_meter_idx ON records (meter);
    CREATE INDEX IF NOT EXISTS records_phone_idx ON records (phone);
    CREATE INDEX IF NOT EXISTS records_zone_idx ON records (zone);
    CREATE INDEX IF NOT EXISTS records_block_idx ON records (block);
    CREATE INDEX IF NOT EXISTS records_sts_idx ON records (sts);

    CREATE TABLE IF NOT EXISTS zone_blocks (
      id SERIAL PRIMARY KEY,
      account TEXT NOT NULL DEFAULT '',
      meter TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      zone TEXT NOT NULL DEFAULT '',
      block TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS zb_account_idx ON zone_blocks (account);
    CREATE INDEX IF NOT EXISTS zb_meter_idx ON zone_blocks (meter);
    CREATE INDEX IF NOT EXISTS zb_phone_idx ON zone_blocks (phone);

    CREATE TABLE IF NOT EXISTS import_logs (
      id SERIAL PRIMARY KEY,
      target TEXT NOT NULL,
      mode TEXT NOT NULL,
      inserted INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const [{ value: recCount }] = await db.select({ value: count() }).from(records);
  const [{ value: logCount }] = await db.select({ value: count() }).from(importLogs);

  if (recCount === 0 && logCount === 0) {
    await seedSampleRegistry();
  }

  initialized = true;
}

export async function seedSampleRegistry(): Promise<{
  recordsInserted: number;
  zoneBlocksInserted: number;
}> {
  await db.delete(records);
  await db.delete(zoneBlocks);
  await db.insert(records).values(SAMPLE_RECORDS);
  await db.insert(zoneBlocks).values(SAMPLE_ZONE_BLOCKS);
  await db.insert(importLogs).values({
    target: "records",
    mode: "replace",
    inserted: SAMPLE_RECORDS.length,
    skipped: 0,
  });
  return {
    recordsInserted: SAMPLE_RECORDS.length,
    zoneBlocksInserted: SAMPLE_ZONE_BLOCKS.length,
  };
}
