"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useShell } from "@/components/AppShell";
import { serializeCsv } from "@/lib/csv";
import {
  AlertIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CopyIcon,
  DatabaseIcon,
  DownloadIcon,
  EditIcon,
  LockIcon,
  MapPinIcon,
  SearchIcon,
  SparkleIcon,
  SpinnerIcon,
} from "@/components/Icons";
import type { RecordRow } from "@/db/schema";

export function splitTokens(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatCell(val: unknown): string {
  return val && String(val).trim() ? String(val) : "—";
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8"
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

const CSV_EXPORT_HEADERS = [
  "Account",
  "Meter",
  "Zone",
  "Block ID",
  "Phone",
  "Longitude",
  "Latitude",
  "STS",
  "City",
];

function rowToCsvArray(r: RecordRow): string[] {
  return [
    r.account,
    r.meter,
    r.zone,
    r.block,
    r.phone,
    r.longitude,
    r.latitude,
    r.sts,
    r.city,
  ];
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl text-slate-300">
        {icon}
      </div>
      <p className="text-base font-bold text-[#10233a]">{title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function RecordDrawer({
  record,
  onClose,
  admin,
  onEdit,
}: {
  record: RecordRow | null;
  onClose: () => void;
  admin: boolean;
  onEdit: (rec: RecordRow) => void;
}) {
  const { t, toast } = useShell();
  const router = useRouter();

  useEffect(() => {
    if (!record) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [record, onClose]);

  if (!record) return null;

  const lat = Number(record.latitude);
  const lon = Number(record.longitude);
  const mapUrl =
    record.latitude &&
    record.longitude &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    (lat !== 0 || lon !== 0)
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`
      : null;

  const fields: [string, string, boolean][] = [
    [t("colAccount"), record.account, true],
    [t("colMeter"), record.meter, true],
    [t("colPhone"), record.phone, true],
    [t("colZone"), record.zone, false],
    [t("fBlock"), record.block, true],
    [t("colLongitude"), record.longitude, true],
    [t("colLatitude"), record.latitude, true],
    [t("colSts"), record.sts, true],
    [t("colCity"), record.city, false],
    [t("fDate"), record.date, true],
    [
      t("fDataset"),
      record.dataset === "linking" ? t("datasetLinking") : t("datasetRecords"),
      false,
    ],
  ];

  const primaryId = record.account || record.meter || record.phone || "";

  return (
    <div
      className="fixed inset-0 z-40 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div
        className="absolute inset-0 bg-[#10233a]/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="drawer absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#c8962e]">
              {t("drawerTitle")}
            </p>
            <h2
              id="drawer-title"
              className="mono truncate text-xl font-bold text-[#10233a]"
            >
              {record.meter || record.account || "—"}
            </h2>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label={t("close")}
          >
            <CloseIcon />
          </button>
        </div>

        <dl className="flex-1 divide-y divide-slate-100 overflow-y-auto px-6">
          {fields.map(([label, val, isMono]) => (
            <div key={label} className="flex items-center gap-3 py-3">
              <dt className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </dt>
              <dd
                className={`min-w-0 flex-1 break-words text-sm text-[#10233a] ${
                  isMono ? "mono" : ""
                }`}
              >
                {formatCell(val)}
              </dd>
              {val && (
                <button
                  type="button"
                  className="btn-icon h-8 w-8"
                  aria-label={`${t("copy")} ${label}`}
                  onClick={async () => {
                    if (await copyToClipboard(val)) {
                      toast(t("copied"), "success");
                    }
                  }}
                >
                  <CopyIcon size={14} />
                </button>
              )}
            </div>
          ))}
          <div className="py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("fNotes")}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
              {formatCell(record.notes)}
            </dd>
          </div>
        </dl>

        <div className="grid gap-2 border-t border-slate-100 p-5 sm:grid-cols-2">
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary justify-center"
            >
              <MapPinIcon size={16} /> {t("openMaps")}
            </a>
          ) : (
            <button
              type="button"
              className="btn-secondary justify-center"
              disabled
            >
              <MapPinIcon size={16} /> {t("openMaps")}
            </button>
          )}
          <button
            type="button"
            className="btn-primary justify-center"
            disabled={!primaryId}
            onClick={() =>
              router.push(`/field?q=${encodeURIComponent(primaryId)}`)
            }
          >
            <ArrowRightIcon size={16} className="rtl:rotate-180" />{" "}
            {t("useInField")}
          </button>
          <button
            type="button"
            className="btn-ghost justify-center sm:col-span-2"
            onClick={() => onEdit(record)}
          >
            {admin ? <EditIcon size={16} /> : <LockIcon size={16} />}{" "}
            {t("editRecord")}
          </button>
        </div>
      </aside>
    </div>
  );
}

type SearchState =
  | {
      mode: "single";
      q: string;
      rows: RecordRow[];
      total: number;
      page: number;
      pageSize: number;
      pages: number;
      ms: number;
    }
  | {
      mode: "bulk";
      queries: string[];
      groups: { query: string; rows: RecordRow[] }[];
      total: number;
      ms: number;
    };

export function SearchPanel() {
  const {
    t,
    toast,
    dataVersion,
    admin,
    openEditor,
    openImport,
    catalog,
    seedSampleData,
  } = useShell();

  const [query, setQuery] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [busyMode, setBusyMode] = useState<"single" | "bulk" | null>(null);
  const [result, setResult] = useState<SearchState | null>(null);
  const [activeRecord, setActiveRecord] = useState<RecordRow | null>(null);
  const firstMount = useRef(true);

  const runSingleSearch = useCallback(
    async (rawQ: string, page = 1, pageSize = 25) => {
      const q = rawQ.trim();
      if (!q) {
        toast(t("enterQuery"), "info");
        return;
      }
      setBusyMode("single");
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q, page, pageSize }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setResult({
          mode: "single",
          q,
          rows: data.rows ?? [],
          total: data.total ?? 0,
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 25,
          pages: data.pages ?? 1,
          ms: data.ms ?? 1,
        });
      } catch {
        toast(t("searchFailed"), "error");
      } finally {
        setBusyMode(null);
      }
    },
    [t, toast]
  );

  const runBulkSearch = useCallback(
    async (rawBulk: string) => {
      const queries = splitTokens(rawBulk).slice(0, 2000);
      if (queries.length === 0) {
        toast(t("enterQuery"), "info");
        return;
      }
      setBusyMode("bulk");
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queries }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setResult({
          mode: "bulk",
          queries,
          groups: data.groups ?? [],
          total: data.total ?? 0,
          ms: data.ms ?? 1,
        });
      } catch {
        toast(t("searchFailed"), "error");
      } finally {
        setBusyMode(null);
      }
    },
    [t, toast]
  );

  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    if (result) {
      if (result.mode === "single") {
        runSingleSearch(result.q, result.page, result.pageSize);
      } else {
        runBulkSearch(result.queries.join("\n"));
      }
      setActiveRecord(null);
    }
  }, [dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  async function collectAllRowsForExport(): Promise<
    { query?: string; row: RecordRow | null }[]
  > {
    if (!result) return [];
    if (result.mode === "bulk") {
      return result.groups.flatMap<{ query?: string; row: RecordRow | null }>(
        (g) =>
          g.rows.length > 0
            ? g.rows.map((r) => ({ query: g.query, row: r }))
            : [{ query: g.query, row: null }]
      );
    }
    if (result.pages <= 1) {
      return result.rows.map((r) => ({ row: r }));
    }
    const collected: RecordRow[] = [];
    for (let p = 1; p <= 50; p++) {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: result.q, page: p, pageSize: 100 }),
      });
      const data = await res.json();
      if (data.rows) collected.push(...data.rows);
      if (p >= (data.pages ?? 1)) break;
    }
    return collected.map((r) => ({ row: r }));
  }

  async function handleDownloadCsv() {
    const items = await collectAllRowsForExport();
    const isBulk = result?.mode === "bulk";
    const headers = isBulk ? ["Query", ...CSV_EXPORT_HEADERS] : CSV_EXPORT_HEADERS;
    const rows = items.map(({ query: q, row }) => {
      const base = row
        ? rowToCsvArray(row)
        : ["Not found", "", "", "", "", "", "", "", ""];
      return isBulk ? [q ?? "", ...base] : base;
    });
    downloadTextFile(
      `runaki-search-${new Date().toISOString().slice(0, 10)}.csv`,
      serializeCsv(headers, rows)
    );
    toast(t("downloaded"), "success");
  }

  const localizedHeaders = () => [
    t("colAccount"),
    t("colMeter"),
    t("colZone"),
    t("colBlockId"),
    t("colPhone"),
    t("colLongitude"),
    t("colLatitude"),
    t("colSts"),
    t("colCity"),
  ];

  async function handleCopyTable() {
    const items = await collectAllRowsForExport();
    const isBulk = result?.mode === "bulk";
    const headers = isBulk
      ? [t("colQuery"), ...localizedHeaders()]
      : localizedHeaders();
    const lines = items.map(({ query: q, row }) => {
      const cells = row
        ? rowToCsvArray(row).map((c) => c ?? "")
        : [t("notFound")];
      return (isBulk ? [q ?? "", ...cells] : cells).join("\t");
    });
    const ok = await copyToClipboard([headers.join("\t"), ...lines].join("\n"));
    if (ok) toast(t("copied"), "success");
  }

  function renderTableRow(
    row: RecordRow,
    key: string,
    queryLabel = "",
    showQueryCol = false
  ) {
    return (
      <tr key={key}>
        {showQueryCol && (
          <td className="mono font-semibold text-[#10233a]">{queryLabel}</td>
        )}
        <td className="mono">{formatCell(row.account)}</td>
        <td className="mono">
          {row.meter ? (
            <button
              type="button"
              className="link font-semibold"
              onClick={() => setActiveRecord(row)}
            >
              {row.meter}
            </button>
          ) : (
            "—"
          )}
        </td>
        <td>{formatCell(row.zone)}</td>
        <td className="mono">{formatCell(row.block)}</td>
        <td className="mono">{formatCell(row.phone)}</td>
        <td className="mono">{formatCell(row.longitude)}</td>
        <td className="mono">{formatCell(row.latitude)}</td>
        <td className="mono">{formatCell(row.sts)}</td>
        <td>{formatCell(row.city)}</td>
        <td className="no-print">
          <button
            type="button"
            className="btn-ghost btn-xs"
            onClick={() => setActiveRecord(row)}
          >
            {t("details")}{" "}
            <ArrowRightIcon size={13} className="rtl:rotate-180" />
          </button>
        </td>
      </tr>
    );
  }

  const totalMatches = result ? result.total : 0;

  return (
    <div className="space-y-6">
      {/* Page Header matching Screenshot 1 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#10233a]">
            {t("searchTitle")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            {t("searchSubtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-2xs">
            <DatabaseIcon size={13} className="text-[#c8962e]" />
            <span className="mono font-semibold text-[#10233a]">
              {catalog.totals.all.toLocaleString()}
            </span>
            <span>{t("recordsIndexed")}</span>
          </span>
          {catalog.totals.all > 0 ? (
            <button
              type="button"
              onClick={() => {
                setQuery("*");
                runSingleSearch("*");
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#2563eb] hover:bg-blue-50 transition"
            >
              {t("browseAll")}
            </button>
          ) : (
            <button
              type="button"
              onClick={seedSampleData}
              className="inline-flex items-center gap-1 rounded-full border border-[#c8962e]/40 bg-[#c8962e]/10 px-3 py-1 text-xs font-semibold text-[#10233a] hover:bg-[#c8962e]/20 transition"
            >
              <SparkleIcon size={13} />
              <span>{t("loadSampleRegistry")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Bulk Select Card matching Screenshot 1 */}
      <section className="card p-5 sm:p-6 no-print">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSingleSearch(query);
          }}
          className="flex flex-col gap-3 sm:flex-row"
          role="search"
        >
          <label className="relative flex-1">
            <span className="sr-only">{t("search")}</span>
            <SearchIcon
              size={16}
              className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="input h-11 ps-10 text-sm"
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>
          <button
            type="submit"
            className="btn-search-soft h-11 px-6 text-sm"
            disabled={busyMode !== null}
          >
            {busyMode === "single" ? (
              <SpinnerIcon size={16} />
            ) : (
              <SearchIcon size={16} />
            )}{" "}
            {t("search")}
          </button>
        </form>

        {/* Quick Query Chips */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400 me-1">
            {t("quickQueries")}
          </span>
          {[
            "EA1409895",
            "6312345678",
            "EA1412262",
            "EE0084207",
            "ER-12",
            "07501234567",
            "Erbil",
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setQuery(sample);
                runSingleSearch(sample);
              }}
              className="rounded-md border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[11px] font-mono text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-[#2563eb] transition"
            >
              {sample}
            </button>
          ))}
        </div>

        {/* Dashed Bulk Select Container matching Screenshot 1 */}
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="bulk-meters"
              className="text-xs font-bold text-[#10233a]"
            >
              {t("bulkTitle")}
            </label>
            <button
              type="button"
              onClick={() => {
                const sample = "EA1409895 EA1412262 EE0084207";
                setBulkInput(sample);
                runBulkSearch(sample);
              }}
              className="text-[11px] font-medium text-[#2563eb] hover:underline"
            >
              {t("trySample")}: EA1409895 EA1412262 EE0084207
            </button>
          </div>

          <textarea
            id="bulk-meters"
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                runBulkSearch(bulkInput);
              }
            }}
            placeholder={t("bulkPlaceholder")}
            rows={4}
            className="input mono min-h-24 resize-y bg-white text-xs text-slate-700"
          />

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {bulkInput.trim() && (
              <span className="mono me-auto text-xs text-slate-500">
                {splitTokens(bulkInput).length.toLocaleString()}
              </span>
            )}
            <button
              type="button"
              className="btn-search-soft px-4 py-2 text-xs"
              onClick={() => runBulkSearch(bulkInput)}
              disabled={busyMode !== null}
            >
              {busyMode === "bulk" && <SpinnerIcon size={14} />}
              {t("selectMeters")}
            </button>
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-xs"
              onClick={() => {
                setBulkInput("");
                if (result?.mode === "bulk") setResult(null);
              }}
            >
              {t("clear")}
            </button>
          </div>
        </div>
      </section>

      {/* Loading Indicator */}
      {busyMode && !result && (
        <div className="card flex items-center justify-center gap-3 p-10 text-slate-500">
          <SpinnerIcon /> {t("loading")}
        </div>
      )}

      {/* Initial State / Empty Registry Card matching Screenshot 1 */}
      {!result && !busyMode && (
        <EmptyState
          icon={<DatabaseIcon size={34} />}
          title={
            catalog.totals.all === 0 ? t("noRecordsTitle") : t("startTitle")
          }
          hint={
            catalog.totals.all === 0 ? t("noRecordsHint") : t("startHint")
          }
          action={
            catalog.totals.all === 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={seedSampleData}
                  className="btn-primary btn-sm"
                >
                  <SparkleIcon size={15} /> {t("loadSampleRegistry")}
                </button>
                <button
                  type="button"
                  onClick={() => openImport("records")}
                  className="btn-secondary btn-sm"
                >
                  {t("customerExtraction")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setQuery("*");
                  runSingleSearch("*");
                }}
                className="btn-secondary btn-sm"
              >
                {t("browseAll")} ({catalog.totals.all.toLocaleString()})
              </button>
            )
          }
        />
      )}

      {/* No Results Found for Single Query */}
      {result && totalMatches === 0 && result.mode === "single" && (
        <EmptyState
          icon={<AlertIcon size={30} />}
          title={t("noResults")}
          hint={t("noResultsHint")}
        />
      )}

      {/* Search Results Table */}
      {result && (totalMatches > 0 || result.mode === "bulk") && (
        <section
          className={`card overflow-hidden ${busyMode ? "opacity-60" : ""}`}
          aria-busy={Boolean(busyMode)}
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3.5 no-print">
            <p className="text-sm font-semibold text-[#10233a]">
              <span className="mono">{totalMatches.toLocaleString()}</span>{" "}
              {totalMatches === 1 ? t("result") : t("results")} ·{" "}
              <span className="mono">{result.ms}ms</span>
            </p>
            <div className="ms-auto flex gap-2">
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={handleDownloadCsv}
              >
                <DownloadIcon size={15} /> {t("download")}
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={handleCopyTable}
              >
                <CopyIcon size={15} /> {t("copy")}
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setResult(null)}
              >
                <CloseIcon size={15} /> {t("clear")}
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {result.mode === "bulk" && <th>{t("colQuery")}</th>}
                  {localizedHeaders().map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                  <th className="no-print">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {result.mode === "single"
                  ? result.rows.map((r) => renderTableRow(r, String(r.id)))
                  : result.groups.map((grp, gIdx) =>
                      grp.rows.length > 0 ? (
                        grp.rows.map((r, rIdx) =>
                          renderTableRow(
                            r,
                            `${gIdx}-${r.id}`,
                            rIdx === 0 ? grp.query : "",
                            true
                          )
                        )
                      ) : (
                        <tr key={`${gIdx}-miss`} className="row-miss">
                          <td className="mono font-semibold">{grp.query}</td>
                          <td colSpan={10}>
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                              <AlertIcon size={14} /> {t("notFound")}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
              </tbody>
            </table>
          </div>

          {result.mode === "single" && result.pages > 1 && (
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-3 text-sm no-print">
              <span className="text-slate-500">
                {t("page")} <span className="mono">{result.page}</span>{" "}
                {t("of")} <span className="mono">{result.pages}</span>
              </span>
              <label className="flex items-center gap-2 text-slate-500">
                <select
                  className="input h-9 w-auto py-0"
                  value={result.pageSize}
                  onChange={(e) =>
                    runSingleSearch(result.q, 1, Number(e.target.value))
                  }
                >
                  {[25, 50, 100].map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
                {t("perPage")}
              </label>
              <div className="ms-auto flex gap-2">
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={result.page <= 1}
                  onClick={() =>
                    runSingleSearch(
                      result.q,
                      result.page - 1,
                      result.pageSize
                    )
                  }
                >
                  <ChevronLeftIcon size={15} className="rtl:rotate-180" />{" "}
                  {t("previous")}
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={result.page >= result.pages}
                  onClick={() =>
                    runSingleSearch(
                      result.q,
                      result.page + 1,
                      result.pageSize
                    )
                  }
                >
                  {t("next")}{" "}
                  <ChevronRightIcon size={15} className="rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <RecordDrawer
        record={activeRecord}
        onClose={() => setActiveRecord(null)}
        admin={admin}
        onEdit={(rec) => openEditor(rec)}
      />
    </div>
  );
}
