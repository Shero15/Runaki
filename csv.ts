export function normalizeHeader(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_\-.#:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const RECORD_HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "record date", "reading date", "sheet date"],
  account: [
    "customer account",
    "account",
    "account number",
    "account no",
    "subscriber",
    "customer account number",
  ],
  city: ["city", "governorate", "town"],
  meter: ["meter", "meter number", "meter no", "meter id", "serial"],
  phone: [
    "phone number",
    "phone",
    "mobile",
    "mobile number",
    "phone no",
    "contact",
  ],
  zone: ["zone", "zone id", "sector"],
  block: ["block number", "block", "block id", "block no"],
  longitude: ["longitude", "lng", "lon", "long", "meter longitude", "x"],
  latitude: ["latitude", "lat", "meter latitude", "y"],
  sts: ["sts number", "sts", "sts no", "sts id", "prepaid sts"],
  notes: ["notes", "note", "remarks", "comment"],
};

export const ZONE_HEADER_ALIASES: Record<string, string[]> = {
  account: RECORD_HEADER_ALIASES.account,
  meter: RECORD_HEADER_ALIASES.meter,
  phone: RECORD_HEADER_ALIASES.phone,
  city: RECORD_HEADER_ALIASES.city,
  zone: RECORD_HEADER_ALIASES.zone,
  block: RECORD_HEADER_ALIASES.block,
};

export const WORKLIST_HEADER_ALIASES: Record<string, string[]> = {
  account: RECORD_HEADER_ALIASES.account,
  meter: RECORD_HEADER_ALIASES.meter,
  phone: RECORD_HEADER_ALIASES.phone,
  query: ["query", "value", "id", "search", "number"],
};

function detectDelimiter(text: string): string {
  const firstLine =
    text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .find((line) => line.trim() !== "") ?? "";
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && ch in counts) {
      counts[ch]++;
    }
  }
  let best = ",";
  for (const cand of [";", "\t"]) {
    if (counts[cand] > counts[best]) best = cand;
  }
  return best;
}

export function parseCsv(text: string, customDelimiter?: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, "");
  const delimiter = customDelimiter ?? detectDelimiter(cleaned);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"' && cell === "") {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && cleaned[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) {
        rows.push(row);
      }
      row = [];
    } else {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.some((c) => c.trim() !== "")) {
    rows.push(row);
  }
  return rows;
}

export function mapCsvRows(
  rows: string[][],
  aliasMap: Record<string, string[]>
): { items: Record<string, string>[]; matched: string[] } {
  if (rows.length === 0) return { items: [], matched: [] };
  const headers = rows[0].map(normalizeHeader);
  const indexMap: Record<string, number> = {};
  const keys = Object.keys(aliasMap);

  for (const key of keys) {
    const idx = headers.findIndex((h) => aliasMap[key].includes(h));
    if (idx >= 0) indexMap[key] = idx;
  }

  const matched = keys.filter((k) => indexMap[k] !== undefined);
  const items = rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    for (const k of matched) {
      obj[k] = (r[indexMap[k]] ?? "").trim();
    }
    return obj;
  });

  return { items, matched };
}

function escapeCsvCell(val: unknown): string {
  let str = val == null ? "" : String(val);
  if (
    /^[=+@]/.test(str) ||
    /^-[^0-9]/.test(str) ||
    /^[\t\r]/.test(str)
  ) {
    str = "'" + str;
  }
  if (/[",\r\n;]/.test(str)) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function serializeCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  return (
    "\uFEFF" +
    [headers, ...rows]
      .map((r) => r.map(escapeCsvCell).join(","))
      .join("\r\n") +
    "\r\n"
  );
}
