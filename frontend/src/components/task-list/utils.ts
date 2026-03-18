import { Task } from "./types";

export function hexToPastel(hex: string, alpha = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function hexToSolid(hex: string, alpha = 0.8): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const PRIORITY_META: Record<
  number,
  { label: string; color: string; bg: string }
> = {
  1: { label: "高", color: "#dc2626", bg: "#fef2f2" },
  2: { label: "中", color: "#d97706", bg: "#fffbeb" },
  3: { label: "低", color: "#64748b", bg: "#f8fafc" },
};

/** 優先度昇順 → 期限昇順（null は末尾）でソート */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

/** 期限ラベルを返す（今日・明日・過去・通常） */
export function dueDateMeta(due: string | null): {
  label: string;
  color: string;
} | null {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}日超過`, color: "#dc2626" };
  if (diff === 0) return { label: "今日", color: "#d97706" };
  if (diff === 1) return { label: "明日", color: "#ca8a04" };
  return {
    label: d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
    color: "#64748b",
  };
}
