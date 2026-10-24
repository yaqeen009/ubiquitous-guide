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
 * Date-like detection. Deliberately conservative: only year-first formats are
 * accepted so that ambiguous values such as 03/04/2025 are not guessed.
 */
export function isDateLike(raw: string): boolean {
  const trimmed = raw.trim();
  if (!ISO_DATE.test(trimmed) && !YEAR_FIRST_DATE.test(trimmed)) return false;
  return Number.isFinite(Date.parse(trimmed.replace(/\//g, "-")));
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
