/**
 * Formats film ratings across the site so that .5 renders as the ½ fraction (e.g. 4.5 -> 4½, 0.5 -> ½).
 */
export function formatRating(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || num <= 0) return "—";

  const intPart = Math.floor(num);
  const decimal = Math.round((num - intPart) * 10) / 10;

  if (decimal >= 0.3 && decimal <= 0.7) {
    return intPart === 0 ? "½" : `${intPart}½`;
  }

  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}
