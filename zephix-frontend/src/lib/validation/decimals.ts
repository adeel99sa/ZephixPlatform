/**
 * Shared decimal validation constants.
 *
 * Use DECIMAL_2_RE for money amounts and KPI targets (matches numeric(12,2)).
 * Use DECIMAL_4_RE only when the DB column is numeric(18,4) AND the backend
 * DTO explicitly allows 4 decimal places.
 */

/** Matches positive decimals with up to 2 decimal places: "100", "99.5", "0.01" */
export const DECIMAL_2_RE = /^\d+(\.\d{1,2})?$/;

/** Matches positive decimals with up to 4 decimal places: "1.0001" */
export const DECIMAL_4_RE = /^\d+(\.\d{1,4})?$/;
