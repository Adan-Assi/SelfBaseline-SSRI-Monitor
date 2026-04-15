export function fmt(n: number | null | undefined, digits = 6) {
  if (n === null || n === undefined) return "-";
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(digits);
}
