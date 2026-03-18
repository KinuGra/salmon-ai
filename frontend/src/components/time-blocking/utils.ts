export const PX_PER_MIN = 1.6; // 1時間 = 96px
export const TIMELINE_START_HOUR = 7;
export const TIMELINE_END_HOUR = 23;

/** "09:30" 形式に変換 */
export function minsToLabel(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** ISO8601 → タイムライン上の top px */
export function isoToTop(iso: string): number {
  const d = new Date(iso);
  const mins = d.getHours() * 60 + d.getMinutes() - TIMELINE_START_HOUR * 60;
  return Math.max(0, mins * PX_PER_MIN);
}

/** ISO8601 → "HH:MM" */
export function isoToLabel(iso: string): string {
  const d = new Date(iso);
  return minsToLabel(d.getHours() * 60 + d.getMinutes());
}

/** HEX カラー → rgba パステル */
export function hexToPastel(hex: string, alpha = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** HEX カラー → rgba 中濃度（ボーダー・テキスト用） */
export function hexToMedium(hex: string, alpha = 0.6): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
