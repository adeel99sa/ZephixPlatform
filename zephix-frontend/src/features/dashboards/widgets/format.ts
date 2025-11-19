export const fmtPercent = (n?: number) =>
  typeof n === "number" ? `${Math.round(n * 100)}%` : "—";
export const trendArrow = (t?: number | "up"|"down"|"flat") => {
  if (typeof t === "number") return t > 0 ? "▲" : t < 0 ? "▼" : "▬";
  return t === "up" ? "▲" : t === "down" ? "▼" : "▬";
};
