/** Strict numeric parsing used by the data pipeline. */

/**
 * Parse a raw CSV cell as a finite number.
 *
 * Rules (intentionally strict and documented in the README):
 * - Leading/trailing whitespace is ignored.
 * - An empty or whitespace-only cell is missing (`null`), never zero.
 * - Standard JavaScript decimal / exponent notation is accepted (`-3`, `1.5e3`).
 * - Thousands separators, currency symbols, percent signs and localized
 *   decimal commas are rejected and reported as invalid numeric values rather
 *   than guessed at.
 */
export function parseNumericValue(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** True when a cell is empty or whitespace-only. */
export function isMissingCell(raw: string | null | undefined): boolean {
  return raw === null || raw === undefined || raw.trim() === "";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const YEAR_FIRST_DATE = /^\d{4}\/\d{1,2}\/\d{1,2}$/;

/**
 * Parse a date-like cell to epoch milliseconds.
 *
 * Detection is deliberately conservative: only year-first formats are
 * accepted, so ambiguous values such as 03/04/2025 are never guessed.
 * Date-only ISO values are interpreted as UTC for deterministic results.
 */
export function parseDateValue(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!ISO_DATE.test(trimmed) && !YEAR_FIRST_DATE.test(trimmed)) return null;
  const normalized = trimmed.replace(/\//g, "-");
  const value = Date.parse(normalized);
  return Number.isFinite(value) ? value : null;
}

/** True when a cell is a supported, parseable year-first date or timestamp. */
export function isDateLike(raw: string): boolean {
  return parseDateValue(raw) !== null;
}

/** Human-readable date for labels and tooltips. */
export function formatDateValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Value for an `<input type="date">`, in local calendar terms. */
export function dateInputValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Parse a date input value at local midnight. */
export function parseDateInput(value: string): number | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return Number.isFinite(date.getTime()) ? date.getTime() : null;
}

/** Compact a number for labels without losing required precision. */
export function formatAxisValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1_000_000 || abs < 0.001)) return value.toExponential(1);
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 10) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}
