"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGUAGES, LangCode, TRANSLATIONS } from "@/lib/i18n";
import {
  mapCsvRows,
  parseCsv,
  RECORD_HEADER_ALIASES,
  ZONE_HEADER_ALIASES,
} from "@/lib/csv";
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  FileTextIcon,
  GlobeIcon,
  InfoIcon,
  LayersIcon,
  LockIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  SparkleIcon,
  SpinnerIcon,
  TrashIcon,
  UploadIcon,
  UsersIcon,
  DownloadIcon,
} from "@/components/Icons";
import type { RecordRow } from "@/db/schema";

export type ToastKind = "info" | "success" | "error";

export interface CatalogSummary {
  totals: {
    records: number;
    linking: number;
    zoneBlocks: number;
    all: number;
  };
  zones: string[];
  cities: string[];
  dataAsOf: string | null;
  sampleAccounts: string[];
}

interface ShellContextValue {
  lang: LangCode;
  dir: "ltr" | "rtl";
  setLang: (code: LangCode) => void;
  t: (key: string) => string;
  admin: boolean;
  requireAdmin: (action: () => void) => void;
  logout: () => Promise<void>;
  toast: (message: string, kind?: ToastKind) => void;
  openImport: (target: "records" | "zone") => void;
  openEditor: (record: RecordRow | null) => void;
  dataVersion: number;
  bumpData: () => void;
  catalog: CatalogSummary;
  seedSampleData: () => Promise<void>;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useShell must be used inside <AppShell>");
  }
  return ctx;
}

function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const { t } = useShell();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleKey);
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      "input:not([type=hidden]),select,textarea,button[data-autofocus]"
    );
    firstFocusable?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#10233a]/55 p-4 pt-[8vh] backdrop-blur-sm no-print"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`card w-full ${wide ? "max-w-3xl" : "max-w-md"} animate-pop p-6`}
      >
        <div className="mb-5 flex items-start gap-3">
          {icon && (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#c8962e]/12 text-[#a77a1f]">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="text-lg font-bold text-[#10233a]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label={t("close")}
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AdminLoginModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useShell();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPassword("");
      setError("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("bad");
      const data = await res.json().catch(() => ({}));
      if (!data.admin) throw new Error("not admin");
      setPassword("");
      onSuccess();
    } catch {
      setError(t("invalidPassword"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("adminTitle")}
      subtitle={t("adminSubtitle")}
      icon={<LockIcon />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="label">{t("adminPassword")}</span>
          <input
            type="password"
            autoComplete="current-password"
            className="input mt-1.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || !password}
          >
            {busy ? <SpinnerIcon /> : <LockIcon size={16} />} {t("signIn")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function LoginGate({ onSuccess }: { onSuccess: (admin: boolean) => void }) {
  const { t } = useShell();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 429) {
        setError("Too many attempts. Please try again later.");
        return;
      }
      if (!res.ok) throw new Error("bad");
      const data = await res.json().catch(() => ({}));
      setPassword("");
      onSuccess(Boolean(data.admin));
    } catch {
      setError(t("invalidPassword"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 text-[#10233a]">
          <LockIcon size={18} />
          <h1 className="text-lg font-semibold">{t("accessTitle")}</h1>
        </div>
        <p className="text-xs uppercase tracking-wider text-slate-400">{t("orgUpper")}</p>
        <label className="block">
          <span className="label">{t("accessPassword")}</span>
          <input
            type="password"
            autoComplete="current-password"
            className="input mt-1.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            autoFocus
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy || !password}>
          {busy ? <SpinnerIcon /> : <LockIcon size={16} />} {t("signIn")}
        </button>
      </form>
    </div>
  );
}

function ImportModal({
  target,
  onClose,
}: {
  target: "records" | "zone" | null;
  onClose: () => void;
}) {
  const { t, toast, bumpData, seedSampleData } = useShell();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: string[][];
    count: number;
    recognised: number;
  } | null>(null);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    skipped: number;
  } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFile(null);
    setPreview(null);
    setMode("append");
    setConfirmReplace(false);
    setResult(null);
    setError("");
  }, [target]);

  async function handleFileSelect(selected: File | null) {
    setFile(selected);
    setResult(null);
    setError("");
    setPreview(null);
    if (!selected || !target) return;
    const text = await selected.text();
    const parsed = parseCsv(text);
    const { matched } = mapCsvRows(
      parsed,
      target === "records" ? RECORD_HEADER_ALIASES : ZONE_HEADER_ALIASES
    );
    setPreview({
      headers: parsed[0] ?? [],
      rows: parsed.slice(1, 4),
      count: Math.max(0, parsed.length - 1),
      recognised: matched.length,
    });
  }

  async function handleImport() {
    if (!file || !target) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("target", target);
      fd.set("mode", mode);
      if (mode === "replace" && confirmReplace) fd.set("confirm", "yes");

      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("importFailed"));

      setResult({
        inserted: data.inserted ?? 0,
        skipped: data.skipped ?? 0,
      });
      toast(
        `${t("importDone")}: ${data.inserted ?? 0} ${t("inserted")}, ${
          data.skipped ?? 0
        } ${t("skipped")}`,
        "success"
      );
      bumpData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("importFailed");
      setError(msg);
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (!target || !window.confirm(t("confirmClear"))) return;
    const ds = target === "records" ? "records" : "zone_blocks";
    const res = await fetch(`/api/records?dataset=${ds}`, { method: "DELETE" });
    if (res.ok) {
      toast(t("cleared"), "success");
      bumpData();
    } else {
      toast(t("importFailed"), "error");
    }
  }

  const templateHref =
    target === "zone"
      ? "/templates/zone-block-template.csv"
      : "/templates/customer-extraction-template.csv";
  const canSubmit =
    Boolean(file) && !busy && (mode === "append" || confirmReplace);

  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      wide
      title={
        target === "zone" ? t("importTitleZone") : t("importTitleRecords")
      }
      subtitle={
        target === "zone" ? t("importHintZone") : t("importHintRecords")
      }
      icon={<UploadIcon />}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt,text/csv"
            className="sr-only"
            id="import-file"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          />
          <label
            htmlFor="import-file"
            className="btn-secondary cursor-pointer"
          >
            <FileTextIcon /> {t("chooseFile")}
          </label>
          <span className="truncate text-sm text-slate-500 mono">
            {file ? file.name : t("noFile")}
          </span>
          <button
            type="button"
            onClick={async () => {
              await seedSampleData();
              onClose();
            }}
            className="btn-ghost btn-sm"
          >
            <SparkleIcon size={15} /> {t("loadSampleRegistry")}
          </button>
          <a
            href={templateHref}
            download
            className="link ms-auto inline-flex items-center gap-1.5 text-sm"
          >
            <DownloadIcon size={15} /> {t("downloadTemplate")}
          </a>
        </div>

        {preview && (
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="label">{t("preview")}</span>
              <span className="mono text-slate-500">
                {preview.count.toLocaleString()} {t("rowsDetected")}
              </span>
            </div>
            <div className="table-wrap rounded-xl border border-slate-200">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    {preview.headers.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {preview.headers.map((_, cIdx) => (
                        <td key={cIdx} className="mono">
                          {row[cIdx] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <fieldset>
          <legend className="label mb-2">{t("mode")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["append", "replace"] as const).map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                  mode === m
                    ? "border-[#2563eb] bg-blue-50 text-[#10233a]"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => {
                    setMode(m);
                    setConfirmReplace(false);
                  }}
                  className="accent-[#2563eb]"
                />
                <span className="font-medium">
                  {m === "append" ? t("modeAppend") : t("modeReplace")}
                </span>
              </label>
            ))}
          </div>
          {mode === "replace" && (
            <label className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <input
                type="checkbox"
                checked={confirmReplace}
                onChange={(e) => setConfirmReplace(e.target.checked)}
                className="mt-0.5 accent-[#c8962e]"
              />
              {t("replaceConfirm")}
            </label>
          )}
        </fieldset>

        {result && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900"
          >
            <CheckIcon />
            <span className="font-semibold">{t("importDone")}</span>
            <span className="mono">
              {result.inserted.toLocaleString()} {t("inserted")} ·{" "}
              {result.skipped.toLocaleString()} {t("skipped")}
            </span>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="btn-danger-ghost"
            onClick={handleClear}
          >
            <TrashIcon size={16} /> {t("clearDataset")}
          </button>
          <div className="ms-auto flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              {t("close")}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!canSubmit}
              onClick={handleImport}
            >
              {busy ? <SpinnerIcon /> : <UploadIcon size={16} />}{" "}
              {busy ? t("importing") : t("import")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const RECORD_FIELDS: { key: keyof RecordRow; label: string; mono?: boolean }[] = [
  { key: "account", label: "colAccount", mono: true },
  { key: "meter", label: "colMeter", mono: true },
  { key: "phone", label: "colPhone", mono: true },
  { key: "sts", label: "colSts", mono: true },
  { key: "zone", label: "colZone" },
  { key: "block", label: "colBlockId" },
  { key: "longitude", label: "colLongitude", mono: true },
  { key: "latitude", label: "colLatitude", mono: true },
  { key: "city", label: "colCity" },
  { key: "date", label: "fDate" },
];

function RecordEditorModal({
  open,
  record,
  onClose,
}: {
  open: boolean;
  record: RecordRow | null;
  onClose: () => void;
}) {
  const { t, toast, bumpData } = useShell();
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {
      dataset: record?.dataset ?? "records",
      notes: record?.notes ?? "",
    };
    for (const { key } of RECORD_FIELDS) {
      next[key] = String(record?.[key] ?? "");
    }
    setForm(next);
  }, [open, record]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.account?.trim() &&
      !form.meter?.trim() &&
      !form.phone?.trim() &&
      !form.sts?.trim()
    ) {
      toast(t("needIdentifier"), "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        record ? `/api/records/${record.id}` : "/api/records",
        {
          method: record ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) throw new Error("Failed");
      toast(t("saved"), "success");
      bumpData();
      onClose();
    } catch {
      toast(t("saveFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!record || !window.confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/records/${record.id}`, { method: "DELETE" });
    if (res.ok) {
      toast(t("deleted"), "success");
      bumpData();
      onClose();
    } else {
      toast(t("saveFailed"), "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={record ? t("editRecord") : t("newRecord")}
      icon={<FileTextIcon />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {RECORD_FIELDS.map(({ key, label, mono }) => (
            <label key={key} className="block">
              <span className="label">{t(label)}</span>
              <input
                className={`input mt-1 ${mono ? "mono" : ""}`}
                value={form[key] ?? ""}
                placeholder={key === "date" ? "yyyy-mm-dd" : undefined}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            </label>
          ))}
          <label className="block">
            <span className="label">{t("fDataset")}</span>
            <select
              className="input mt-1"
              value={form.dataset ?? "records"}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, dataset: e.target.value }))
              }
            >
              <option value="records">{t("datasetRecords")}</option>
              <option value="linking">{t("datasetLinking")}</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="label">{t("fNotes")}</span>
          <textarea
            className="input mt-1 min-h-20"
            value={form.notes ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
        </label>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {record && (
            <button
              type="button"
              className="btn-danger-ghost"
              onClick={handleDelete}
            >
              <TrashIcon size={16} /> {t("deleteRecord")}
            </button>
          )}
          <div className="ms-auto flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              {t("cancel")}
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? <SpinnerIcon /> : <CheckIcon size={16} />}{" "}
              {busy ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

const LANG_STORAGE_KEY = "runaki_lang";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [lang, setLangState] = useState<LangCode>("en");
  const [admin, setAdmin] = useState(false);
  const [authState, setAuthState] = useState<"loading" | "out" | "in">("loading");
  const [loginOpen, setLoginOpen] = useState(false);
  const pendingAdminAction = useRef<(() => void) | null>(null);
  const [importTarget, setImportTarget] = useState<"records" | "zone" | null>(
    null
  );
  const [editorState, setEditorState] = useState<{
    open: boolean;
    record: RecordRow | null;
  }>({ open: false, record: null });
  const [toasts, setToasts] = useState<
    { id: number; kind: ToastKind; message: string }[]
  >([]);
  const [dataVersion, setDataVersion] = useState(0);
  const toastCounter = useRef(0);
  const [catalog, setCatalog] = useState<CatalogSummary>({
    totals: { records: 0, linking: 0, zoneBlocks: 0, all: 0 },
    zones: [],
    cities: [],
    dataAsOf: null,
    sampleAccounts: [],
  });

  const dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? "ltr";

  useEffect(() => {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY) as LangCode | null;
    if (saved && saved in TRANSLATIONS) {
      setLangState(saved);
    }
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setAdmin(Boolean(d.admin));
        setAuthState(d.authenticated ? "in" : "out");
      })
      .catch(() => {
        setAdmin(false);
        setAuthState("out");
      });
  }, []);

  useEffect(() => {
    if (authState !== "in") return;
    fetch("/api/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setCatalog({
            totals: d.totals ?? { records: 0, linking: 0, zoneBlocks: 0, all: 0 },
            zones: d.zones ?? [],
            cities: d.cities ?? [],
            dataAsOf: d.dataAsOf ?? null,
            sampleAccounts: d.sampleAccounts ?? [],
          });
        }
      })
      .catch(() => {});
  }, [dataVersion, authState]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((code: LangCode) => {
    setLangState(code);
    window.localStorage.setItem(LANG_STORAGE_KEY, code);
  }, []);

  const t = useCallback(
    (key: string) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key,
    [lang]
  );

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev.slice(-4), { id, kind, message }]);
    setTimeout(
      () => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      },
      kind === "error" ? 6000 : 3800
    );
  }, []);

  const requireAdmin = useCallback(
    (action: () => void) => {
      if (admin) {
        action();
      } else {
        pendingAdminAction.current = action;
        setLoginOpen(true);
      }
    },
    [admin]
  );

  const logout = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    setAdmin(false);
    setAuthState("out");
    toast(TRANSLATIONS[lang].signedOut, "info");
  }, [lang, toast]);

  const bumpData = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  const seedSampleData = useCallback(async () => {
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      if (res.ok) {
        toast(t("sampleLoaded"), "success");
        bumpData();
      }
    } catch {
      toast(t("importFailed"), "error");
    }
  }, [bumpData, t, toast]);

  const contextValue = useMemo<ShellContextValue>(
    () => ({
      lang,
      dir,
      setLang,
      t,
      admin,
      requireAdmin,
      logout,
      toast,
      openImport: (target) => requireAdmin(() => setImportTarget(target)),
      openEditor: (record) =>
        requireAdmin(() => setEditorState({ open: true, record })),
      dataVersion,
      bumpData,
      catalog,
      seedSampleData: () =>
        new Promise<void>((resolve) => {
          requireAdmin(() => {
            seedSampleData().finally(resolve);
          });
        }),
    }),
    [
      lang,
      dir,
      setLang,
      t,
      admin,
      requireAdmin,
      logout,
      toast,
      dataVersion,
      bumpData,
      catalog,
      seedSampleData,
    ]
  );

  const isFieldPage =
    pathname?.startsWith("/field") || pathname?.startsWith("/lookup");

  const navItems = [
    {
      href: "/",
      label: t("navSearching"),
      icon: <SearchIcon size={16} />,
      active: pathname === "/",
    },
    {
      href: "/field",
      label: t("navField"),
      icon: <UsersIcon size={16} />,
      active: Boolean(isFieldPage),
    },
  ];

  if (authState !== "in") {
    return (
      <ShellContext.Provider value={contextValue}>
        <div dir={dir}>
          {authState === "out" && (
            <LoginGate
              onSuccess={(isAdmin) => {
                setAdmin(isAdmin);
                setAuthState("in");
              }}
            />
          )}
        </div>
      </ShellContext.Provider>
    );
  }

  return (
    <ShellContext.Provider value={contextValue}>
      <div className="flex min-h-screen flex-col" dir={dir}>
        {/* Header matching screenshots */}
        <header className="border-b border-slate-200/80 bg-white no-print">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="flex shrink-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
              aria-label="RUNAKI"
            >
              <Image
                src="/brand/runaki-logo.png"
                alt="RUNAKI"
                width={96}
                height={96}
                priority
                className="h-16 w-16 object-contain sm:h-20 sm:w-20"
              />
            </Link>

            <nav className="flex items-center gap-2" aria-label="Main">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={`nav-btn ${item.active ? "nav-btn-active" : ""}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="ms-auto flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                className="header-pill-btn"
                onClick={() => contextValue.openEditor(null)}
                title={t("record")}
              >
                {admin ? (
                  <PlusIcon size={15} className="text-slate-500" />
                ) : (
                  <LockIcon size={15} className="text-slate-500" />
                )}
                <span>{t("record")}</span>
              </button>

              <button
                type="button"
                className="header-pill-btn"
                onClick={() => contextValue.openImport("records")}
              >
                <UploadIcon size={15} className="text-[#c8962e]" />
                <span>{t("customerExtraction")}</span>
              </button>

              {isFieldPage && (
                <button
                  type="button"
                  className="header-pill-btn-dark"
                  onClick={() => contextValue.openImport("zone")}
                >
                  <LayersIcon size={15} className="text-[#c8962e]" />
                  <span>{t("zoneBlock")}</span>
                </button>
              )}

              <label className="relative flex items-center">
                <span className="sr-only">{t("language")}</span>
                <GlobeIcon
                  size={15}
                  className="pointer-events-none absolute start-3.5 text-slate-500"
                />
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as LangCode)}
                  className="select-lang"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  size={14}
                  className="pointer-events-none absolute end-3.5 text-slate-400"
                />
              </label>

              {admin && (
                <button
                  type="button"
                  className="btn-icon"
                  onClick={logout}
                  title={t("signOut")}
                  aria-label={t("signOut")}
                >
                  <LogOutIcon size={17} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>

        {/* Footer matching screenshots */}
        <footer className="border-t border-slate-200 bg-white text-slate-600 no-print">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="inline-flex items-center gap-2 font-semibold text-[#10233a]">
              <ShieldIcon size={15} className="text-[#c8962e]" />
              <span>{t("footerCredit")}</span>
            </p>
            <p className="text-slate-500">{t("footerNote")}</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {t("orgUpper")}
            </p>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <AdminLoginModal
        open={loginOpen}
        onClose={() => {
          setLoginOpen(false);
          pendingAdminAction.current = null;
        }}
        onSuccess={() => {
          setAdmin(true);
          setLoginOpen(false);
          toast(t("signedIn"), "success");
          const fn = pendingAdminAction.current;
          pendingAdminAction.current = null;
          if (fn) setTimeout(fn, 0);
        }}
      />

      <ImportModal
        target={importTarget}
        onClose={() => setImportTarget(null)}
      />

      <RecordEditorModal
        open={editorState.open}
        record={editorState.record}
        onClose={() => setEditorState({ open: false, record: null })}
      />

      {/* Toast stack */}
      <div
        className="pointer-events-none fixed end-4 top-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2 no-print"
        aria-live="polite"
        role="status"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`toast toast-${item.kind} pointer-events-auto animate-pop`}
          >
            <span className="mt-0.5 shrink-0">
              {item.kind === "success" ? (
                <CheckIcon size={17} />
              ) : item.kind === "error" ? (
                <AlertIcon size={17} />
              ) : (
                <InfoIcon size={17} />
              )}
            </span>
            <p className="flex-1 text-sm">{item.message}</p>
            <button
              type="button"
              className="shrink-0 opacity-60 hover:opacity-100"
              onClick={() =>
                setToasts((prev) => prev.filter((x) => x.id !== item.id))
              }
              aria-label={t("close")}
            >
              <CloseIcon size={15} />
            </button>
          </div>
        ))}
      </div>
    </ShellContext.Provider>
  );
}
