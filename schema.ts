import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const records = pgTable(
  "records",
  {
    id: serial("id").primaryKey(),
    dataset: text("dataset").notNull().default("records"), // "records" | "linking"
    date: text("date").notNull().default(""),
    account: text("account").notNull().default(""),
    city: text("city").notNull().default(""),
    meter: text("meter").notNull().default(""),
    phone: text("phone").notNull().default(""),
    zone: text("zone").notNull().default(""),
    block: text("block").notNull().default(""),
    longitude: text("longitude").notNull().default(""),
    latitude: text("latitude").notNull().default(""),
    sts: text("sts").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("records_account_idx").on(table.account),
    index("records_meter_idx").on(table.meter),
    index("records_phone_idx").on(table.phone),
    index("records_zone_idx").on(table.zone),
    index("records_block_idx").on(table.block),
    index("records_sts_idx").on(table.sts),
  ]
);

export const zoneBlocks = pgTable(
  "zone_blocks",
  {
    id: serial("id").primaryKey(),
    account: text("account").notNull().default(""),
    meter: text("meter").notNull().default(""),
    phone: text("phone").notNull().default(""),
    city: text("city").notNull().default(""),
    zone: text("zone").notNull().default(""),
    block: text("block").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("zb_account_idx").on(table.account),
    index("zb_meter_idx").on(table.meter),
    index("zb_phone_idx").on(table.phone),
  ]
);

export const importLogs = pgTable("import_logs", {
  id: serial("id").primaryKey(),
  target: text("target").notNull(), // "records" | "zone"
  mode: text("mode").notNull(), // "append" | "replace"
  inserted: integer("inserted").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RecordRow = typeof records.$inferSelect;
export type NewRecordRow = typeof records.$inferInsert;
export type ZoneBlockRow = typeof zoneBlocks.$inferSelect;
export type NewZoneBlockRow = typeof zoneBlocks.$inferInsert;
