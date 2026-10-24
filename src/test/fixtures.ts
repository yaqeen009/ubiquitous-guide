/** Small, explicit CSV fixtures shared by unit and component tests. */

/** Mixed types, one missing numeric value, one categorical missing value. */
export const MIXED_CSV = [
  "Station,Region,Zone,PM2.5,NO2,Note",
  "AQ-1,North,Urban,10,1.5,ok",
  "AQ-2,South,Urban,,2.5,ok",
  "AQ-3,North,Industrial,30,3.5,needs review",
  'AQ-4,West,Riverside,20,4,"=1+1"',
  "AQ-5,North,Suburban,40,5,",
].join("\n");

/** Two clean numeric columns plus a categorical column for filter tests. */
export const SIMPLE_CSV = [
  "Group,Alpha,Beta",
  "A,1,10",
  "A,2,20",
  "B,3,30",
  "B,4,40",
  "C,5,50",
].join("\n");

/**
 * 20 rows that exercise every inferred type:
 * - `id` numeric, `group` categorical, `label` text, `value` numeric with two
 *   invalid cells (still numeric), `when` date, `empty` empty.
 */
export function buildInferenceCsv(rowCount = 20): string {
  const lines = ["id,group,label,value,when,empty"];
  for (let index = 1; index <= rowCount; index += 1) {
    const value = index === 7 || index === 14 ? "n/a" : String(index * 1.5);
    const day = String((index % 28) + 1).padStart(2, "0");
    lines.push([String(index), index % 2 === 0 ? "A" : "B", `label-${index}`, value, `2024-01-${day}`, ""].join(","));
  }
  return lines.join("\n");
}

/** Duplicate headers, one short row and one row with too many fields. */
export const MALFORMED_CSV = ["A,A,B", "1,2,3", "4,5", "6,7,8,9"].join("\n");

/** Strongly correlated x/y and an independent z, for default-axis tests. */
export const CORRELATED_CSV = [
  "x,y,z",
  "1,2,9",
  "2,4,1",
  "3,6,8",
  "4,8,2",
  "5,10,7",
  "6,12,3",
  "7,14,6",
  "8,16,4",
].join("\n");

export const UNSUPPORTED_FILE = new File(["not a csv"], "data.pdf", { type: "application/pdf" });
