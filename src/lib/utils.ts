import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Human-friendly number with a fixed maximum precision. Never prints NaN. */
export function formatNumber(value: number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return numberFormatter.format(value);
}

/** Compact count, e.g. 12.4K. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return compactFormatter.format(value);
}

/** Display a raw CSV cell without inventing values. */
export function displayCell(value: string | undefined): string {
  if (value === undefined || value === "") return "—";
  return value;
}

export function isNumericType(type: string): boolean {
  return type === "numeric";
}

/** Trigger a browser download without a server round-trip. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename: string, text: string, mime = "text/plain;charset=utf-8"): void {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

export function safeFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim();
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "dataset";
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
