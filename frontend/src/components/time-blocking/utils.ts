/** hex (#RRGGBB) → pastel rgba string */
export function hexToPastel(hex: string, alpha = 0.18): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function hexToMedium(hex: string, alpha = 0.55): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** ISO string → minutes since midnight */
export function toMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** minutes → "HH:MM" */
export function minsToLabel(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const PX_PER_MIN = 1.5; // 1 minute = 1.5px → 1 hour = 90px
export const TIMELINE_START_HOUR = 8; // 08:00
export const TIMELINE_END_HOUR = 22; // 22:00
