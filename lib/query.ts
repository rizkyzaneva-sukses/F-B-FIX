/**
 * Helpers for building safe PostgREST query strings.
 *
 * Two problems this fixes:
 *  - User-supplied filter values were interpolated raw, so a caller could smuggle in
 *    extra `&`-separated PostgREST params (e.g. their own `limit`).
 *  - Date ranges used `lte.<date>T23:59:59`, which silently drops anything recorded in
 *    the final second of the day. An exclusive upper bound has no such gap.
 */

/** True for a plain YYYY-MM-DD date. */
export function isIsoDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** Inclusive lower bound for a day: `2026-08-24` -> `2026-08-24T00:00:00`. */
export function dayStart(date: string): string {
  return `${date}T00:00:00`;
}

/**
 * Exclusive upper bound for a day: `2026-08-24` -> `2026-08-25T00:00:00`.
 * Pair with `lt.` (not `lte.`) so the whole final second of the day is included.
 */
export function dayEndExclusive(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return `${next.toISOString().slice(0, 10)}T00:00:00`;
}

/** Today as YYYY-MM-DD. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** First day of the current month as YYYY-MM-DD. */
export function monthStart(): string {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

/**
 * Return `value` only when it is one of `allowed`, otherwise null.
 * Use for enum-shaped query params so they can never carry query syntax.
 */
export function pickEnum<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}
