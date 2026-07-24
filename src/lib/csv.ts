/**
 * Minimal CSV serialisation utilities.
 *
 * Rules applied:
 *   - Values that contain a comma, double-quote, or newline are wrapped in
 *     double-quotes.
 *   - Any double-quote inside a value is escaped by doubling it ("").
 *   - null / undefined render as an empty cell.
 *   - Numbers and booleans are coerced to string without quoting.
 *   - Values starting with formula-injection characters (=+-\t\r@) are
 *     prefixed with a single-quote to prevent CSV/Excel formula injection.
 */

/** Characters that trigger formula interpretation in spreadsheets. */
const FORMULA_PREFIX_CHARS = /^[=+\-@\t\r]/;

/** Escape and optionally quote a single CSV cell value.
 *  Cells starting with formula-injection characters are prefixed
 *  with a single-quote to force spreadsheet text rendering. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Prefix with single-quote to neutralise formula-injection characters
  const safe = FORMULA_PREFIX_CHARS.test(str) ? "'" + str : str;
  if (/[,"\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Serialise an array of objects to CSV text.
 *
 * The column order is determined by the keys of the first row.  Subsequent
 * rows that are missing a key emit an empty cell; extra keys are ignored so
 * the header is stable.
 */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const lines: string[] = [headers.map(csvCell).join(",")];

  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }

  return lines.join("\n");
}
