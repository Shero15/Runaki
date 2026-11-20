"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useShell } from "@/components/AppShell";
import {
  copyToClipboard,
  downloadTextFile,
  splitTokens,
} from "@/components/SearchPanel";
import {
  mapCsvRows,
  parseCsv,
  serializeCsv,
  WORKLIST_HEADER_ALIASES,
} from "@/lib/csv";
import {
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  LayersIcon,
  SearchIcon,
  SpinnerIcon,
  UploadIcon,
  UsersIcon,
} from "@/components/Icons";

interface ResolvedFieldRow {
  query: string;
  matched: boolean;
  date: string;
  account: string;
  city: string;
  meter: string;
  phone: string;
  zone: string;
  block: string;
  longitude: string;
  latitude: string;
  sts: string;
}

const DEFAULT_SAMPLES = [
  "6312345678",
  "6301234567",
  "EA1409895",
  "6200000001",
  "6300000002",
];

const SHEET_CSV_HEADERS = [
  "Date",
  "Customer Account",
  "City",
  "Meter",
  "Phone Number",
  "Zone",
  "Block Number",
  "Longitude",
  "Latitude",
  "STS number",
];

function sheetRowToArray(r: ResolvedFieldRow): string[] {
  return [
    r.date,
    r.account,
    r.city,
    r.meter,
    r.phone,
    r.zone,
    r.block,
    r.longitude,
    r.latitude,
    r.sts,
  ];
}

function todayIso(): string {
  return "2026-11-19";
}

export function FieldPanel() {
  const { t, toast, dataVersion, openImport, catalog } = useShell();
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [singleValue, setSingleValue] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [lookupBy, setLookupBy] = useState<
    "auto" | "account" | "meter" | "phone"
  >("auto");
  const [sheetDate, setSheetDate] = useState(todayIso());
  const [cityIfBlank, setCityIfBlank] = useState("");
  const [rows, setRows] = useState<ResolvedFieldRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const lastQueryRef = useRef<{
    queries: string[];
    field: "auto" | "account" | "meter" | "phone";
  } | null>(null);
  const worklistInputRef = useRef<HTMLInputElement>(null);
  const firstMount = useRef(true);

  const resolveItems = useCallback(
    async (
      rawQueries: string[],
      fieldOverride: "auto" | "account" | "meter" | "phone" = lookupBy
    ) => {
      const cleaned = rawQueries.map((s) => s.trim()).filter(Boolean);
      if (cleaned.length === 0) {
        toast(t("enterQuery"), "info");
        return;
      }
      if (cleaned.length > 2000) {
        toast(t("tooMany"), "info");
      }
      const items = cleaned.slice(0, 2000).map((query) => ({
        query,
        field: fieldOverride,
        date: sheetDate || todayIso(),
        city: cityIfBlank,
      }));

      setBusy(true);
      try {
        const res = await fetch("/api/field/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setRows(data.rows ?? []);
        lastQueryRef.current = {
          queries: cleaned.slice(0, 2000),
          field: fieldOverride,
        };
        toast(
          `${(data.rows ?? []).length.toLocaleString()} ${t("rowsResolved")}`,
          "success"
        );
      } catch {
        toast(t("resolveFailed"), "error");
      } finally {
        setBusy(false);
      }
    },
    [cityIfBlank, lookupBy, sheetDate, t, toast]
  );

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const list =
      mode === "single" ? [singleValue] : splitTokens(bulkValue);
    resolveItems(list);
  }

  async function handleTrySample() {
    const samples =
      catalog.sampleAccounts.length > 0
        ? catalog.sampleAccounts
        : DEFAULT_SAMPLES;
    setMode("bulk");
    setLookupBy("auto");
    setBulkValue(samples.join("\n"));
    await resolveItems(samples, "auto");
  }

  async function handleWorklistUpload(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    const { items, matched } = mapCsvRows(parsed, WORKLIST_HEADER_ALIASES);
    let field: "auto" | "account" | "meter" | "phone" = "auto";
    let extracted: string[] = [];

    if (matched.length > 0) {
      const nonQuery = matched.filter((m) => m !== "query");
      if (nonQuery.length === 1 && !matched.includes("query")) {
        field = nonQuery[0] as "account" | "meter" | "phone";
      }
      extracted = items
        .map((it) =>
          (it.account || it.meter || it.phone || it.query || "").trim()
        )
        .filter(Boolean);
    } else {
      extracted = parsed.map((r) => (r[0] ?? "").trim()).filter(Boolean);
    }

    if (worklistInputRef.current) worklistInputRef.current.value = "";

    if (extracted.length > 0) {
      setMode("bulk");
      setBulkValue(extracted.join("\n"));
      setLookupBy(field);
      await resolveItems(extracted, field);
    } else {
      toast(t("worklistEmpty"), "error");
    }
  }

  async function handleCopySheet() {
    if (!rows) return;
    const headerLine = [
      t("hDate"),
      t("hCustomerAccount"),
      t("hCity"),
      t("hMeter"),
      t("hPhone"),
      t("hZone"),
      t("hBlock"),
      t("hLongitude"),
      t("hLatitude"),
      t("hSts"),
    ].join("\t");
    const bodyLines = rows.map((r) => sheetRowToArray(r).join("\t"));
    const ok = await copyToClipboard([headerLine, ...bodyLines].join("\n"));
    if (ok) toast(t("copied"), "success");
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setSingleValue(q);
      setMode("single");
      (async () => {
        try {
          const res = await fetch("/api/field/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: [{ query: q, field: "auto", date: todayIso() }],
            }),
          });
          const data = await res.json();
          if (res.ok && data.rows) {
            setRows(data.rows);
            lastQueryRef.current = { queries: [q], field: "auto" };
          }
        } catch {}
      })();
    }
  }, []);

  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    if (lastQueryRef.current) {
      resolveItems(lastQueryRef.current.queries, lastQueryRef.current.field);
    }
  }, [dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const bulkCount = splitTokens(bulkValue).length;

  return (
    <div className="space-y-6">
      {/* Page Header matching Screenshot 2 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#10233a]">
            {t("fieldTitle")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            {t("fieldSubtitle")}
          </p>
        </div>

        {/* Right-hand buttons in Field team detail header matching Screenshot 2 */}
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <button
            type="button"
            className="header-pill-btn"
            onClick={() => openImport("records")}
          >
            <UploadIcon size={15} className="text-[#c8962e]" />
            <span>{t("customerExtraction")}</span>
          </button>
          <button
            type="button"
            className="header-pill-btn-dark"
            onClick={() => openImport("zone")}
          >
            <LayersIcon size={15} className="text-[#c8962e]" />
            <span>{t("zoneBlock")}</span>
          </button>
        </div>
      </div>

      {/* Main Controls Card matching Screenshot 2 */}
      <section className="card p-5 sm:p-6 no-print">
        <form onSubmit={handleSubmit}>
          {/* Top toolbar row inside card */}
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <div
              className="segmented"
              role="tablist"
              aria-label={`${t("single")} / ${t("bulk")}`}
            >
              {(["single", "bulk"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab}
                  className={mode === tab ? "seg-active" : ""}
                  onClick={() => setMode(tab)}
                >
                  {tab === "single" ? t("single") : t("bulk")}
                </button>
              ))}
            </div>

            <div className="ms-auto flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                className="rounded-full border border-[#c8962e]/40 bg-[#fdfaf2] px-4 py-1.5 text-xs font-semibold text-[#10233a] hover:bg-[#c8962e]/15 transition"
                onClick={handleTrySample}
              >
                {t("trySample")}
              </button>

              <input
                ref={worklistInputRef}
                id="worklist"
                type="file"
                accept=".csv,.txt,text/csv"
                className="sr-only"
                onChange={(e) =>
                  handleWorklistUpload(e.target.files?.[0] ?? null)
                }
              />
              <label
                htmlFor="worklist"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-[#10233a] hover:bg-slate-50 transition"
              >
                <FileTextIcon size={14} className="text-slate-500" />
                <span>{t("importWorklist")}</span>
              </label>

              <a
                href="/templates/field-worklist-template.csv"
                download
                className="link text-xs font-semibold"
              >
                {t("downloadTemplate")}
              </a>
            </div>
          </div>

          {/* Horizontal Lookup Row matching Screenshot 2 */}
          {mode === "single" ? (
            <div className="grid items-end gap-3 md:grid-cols-[140px_1fr_165px_160px_140px]">
              <label className="block">
                <span className="label">{t("lookupBy")}</span>
                <select
                  className="input mt-1.5 h-11"
                  value={lookupBy}
                  onChange={(e) =>
                    setLookupBy(
                      e.target.value as "auto" | "account" | "meter" | "phone"
                    )
                  }
                >
                  <option value="auto">{t("auto")}</option>
                  <option value="account">{t("account")}</option>
                  <option value="meter">{t("meter")}</option>
                  <option value="phone">{t("phone")}</option>
                </select>
              </label>

              <label className="block">
                <span className="label">{t("lookupBy")}</span>
                <input
                  className="input mono mt-1.5 h-11"
                  value={singleValue}
                  onChange={(e) => setSingleValue(e.target.value)}
                  placeholder={t("singlePlaceholder")}
                  autoComplete="off"
                />
              </label>

              <label className="block">
                <span className="label">{t("sheetDate")}</span>
                <input
                  type="date"
                  className="input mono mt-1.5 h-11"
                  value={sheetDate}
                  onChange={(e) => setSheetDate(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="label">{t("cityIfBlank")}</span>
                <input
                  className="input mt-1.5 h-11"
                  value={cityIfBlank}
                  placeholder={t("optional")}
                  onChange={(e) => setCityIfBlank(e.target.value)}
                />
              </label>

              <button
                type="submit"
                className="btn-primary h-11 justify-center px-6 text-sm"
                disabled={busy}
              >
                {busy ? <SpinnerIcon size={16} /> : <SearchIcon size={16} />}{" "}
                {t("resolve")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
                <label className="block">
                  <span className="label">{t("lookupBy")}</span>
                  <select
                    className="input mt-1.5 h-11"
                    value={lookupBy}
                    onChange={(e) =>
                      setLookupBy(
                        e.target.value as "auto" | "account" | "meter" | "phone"
                      )
                    }
                  >
                    <option value="auto">{t("auto")}</option>
                    <option value="account">{t("account")}</option>
                    <option value="meter">{t("meter")}</option>
                    <option value="phone">{t("phone")}</option>
                  </select>
                </label>

                <label className="block">
                  <span className="label flex justify-between">
                    <span>{t("bulkFieldPlaceholder")}</span>
                    <span
                      className={`mono ${
                        bulkCount > 2000 ? "text-red-600" : "text-slate-400"
                      }`}
                    >
                      {bulkCount.toLocaleString()} / 2,000
                    </span>
                  </span>
                  <textarea
                    className="input mono mt-1.5 min-h-32 resize-y"
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        handleSubmit();
                      }
                    }}
                    placeholder={"6312345678\nEA1409895\n07501234567"}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <label className="block">
                  <span className="label">{t("sheetDate")}</span>
                  <input
                    type="date"
                    className="input mono mt-1.5 h-11 w-44"
                    value={sheetDate}
                    onChange={(e) => setSheetDate(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="label">{t("cityIfBlank")}</span>
                  <input
                    className="input mt-1.5 h-11 w-52"
                    value={cityIfBlank}
                    placeholder={t("optional")}
                    onChange={(e) => setCityIfBlank(e.target.value)}
                  />
                </label>

                <button
                  type="submit"
                  className="btn-primary ms-auto h-11 px-8 text-sm"
                  disabled={busy}
                >
                  {busy ? <SpinnerIcon size={16} /> : <SearchIcon size={16} />}{" "}
                  {t("resolve")}
                </button>
              </div>
            </div>
          )}
        </form>
      </section>

      {/* Empty State Card matching Screenshot 2 */}
      {!rows && !busy && (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-3 text-slate-300">
            <UsersIcon size={36} />
          </div>
          <p className="text-sm text-slate-500">{t("sheetEmptyHint")}</p>
        </div>
      )}

      {busy && !rows && (
        <div className="card flex items-center justify-center gap-3 p-10 text-slate-500">
          <SpinnerIcon /> {t("loading")}
        </div>
      )}

      {/* Resolved Field Sheet Table */}
      {rows && (
        <section
          className={`card overflow-hidden ${busy ? "opacity-60" : ""}`}
          aria-busy={busy}
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5 no-print">
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => {
                downloadTextFile(
                  `runaki-field-sheet-${sheetDate || todayIso()}.csv`,
                  serializeCsv(SHEET_CSV_HEADERS, rows.map(sheetRowToArray))
                );
                toast(t("downloaded"), "success");
              }}
            >
              <DownloadIcon size={15} /> {t("download")}
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleCopySheet}
            >
              <CopyIcon size={15} /> {t("copy")}
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                setRows(null);
                lastQueryRef.current = null;
              }}
            >
              <CloseIcon size={15} /> {t("clear")}
            </button>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">{t("hNo")}</th>
                  <th>{t("hDate")}</th>
                  <th>{t("hCustomerAccount")}</th>
                  <th>{t("hCity")}</th>
                  <th>{t("hMeter")}</th>
                  <th>{t("hPhone")}</th>
                  <th>{t("hZone")}</th>
                  <th>{t("hBlock")}</th>
                  <th>{t("hLongitude")}</th>
                  <th>{t("hLatitude")}</th>
                  <th>{t("hSts")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className={r.matched ? "" : "row-miss"}>
                    <td className="mono text-slate-400">{idx + 1}</td>
                    <td className="mono">{r.date}</td>
                    <td className="mono">{r.account}</td>
                    <td>{r.city}</td>
                    <td className="mono">{r.meter}</td>
                    <td className="mono">{r.phone}</td>
                    <td>{r.zone}</td>
                    <td className="mono">{r.block}</td>
                    <td className="mono">{r.longitude}</td>
                    <td className="mono">{r.latitude}</td>
                    <td className="mono">{r.sts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
