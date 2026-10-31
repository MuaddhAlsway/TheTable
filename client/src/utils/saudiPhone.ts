/** Accepted formats: 05XXXXXXXX, 5XXXXXXXX, or +9665XXXXXXXX. */
export type SaudiMobileNumber = `+9665${string}`;

export const SAUDI_MOBILE_ERROR = "Enter a Saudi mobile number: 05XXXXXXXX, 5XXXXXXXX, or +9665XXXXXXXX.";

export function normalizeSaudiMobile(value: string): SaudiMobileNumber | null {
  // Remove only permitted formatting; letters, extra plus signs, and other
  // characters remain and fail validation. Never cut off excess digits.
  const compact = value.replace(/[\s()-]/g, "");
  if (!/^(?:05\d{8}|5\d{8}|\+9665\d{8})$/.test(compact)) return null;
  const national = compact.startsWith("+966") ? compact.slice(4) : compact.startsWith("0") ? compact.slice(1) : compact;
  return `+966${national}` as SaudiMobileNumber;
}
