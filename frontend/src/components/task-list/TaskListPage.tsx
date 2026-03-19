"use client";

import { useState } from "react";
import { Task } from "./types";
import { MOCK_TASKS } from "./mock-data";
import { sortTasks } from "./utils";
import TaskListItem from "./TaskListItem";

// ────────────────────────────────────────────
// 見積もり時間: クイック選択肢
// ────────────────────────────────────────────
const DURATION_QUICK: { label: string; mins: number }[] = [
  { label: "15m", mins: 15 },
  { label: "30m", mins: 30 },
  { label: "45m", mins: 45 },
  { label: "1h",  mins: 60 },
  { label: "1.5h",mins: 90 },
  { label: "2h",  mins: 120 },
  { label: "3h",  mins: 180 },
  { label: "4h",  mins: 240 },
];

/** "1h30m" / "2h" / "45m" / "1.5h" → 分数に変換、パース失敗は null */
function parseDurationInput(raw: string): number | null {
  const s = raw.trim();
  // "1h30m" or "1h 30m"
  const hm = s.match(/^(\d+(?:\.\d+)?)h\s*(\d+)m$/i);
  if (hm) return Math.round(parseFloat(hm[1]) * 60 + parseInt(hm[2]));
  // "1h" or "1.5h"
  const h = s.match(/^(\d+(?:\.\d+)?)h$/i);
  if (h) return Math.round(parseFloat(h[1]) * 60);
  // "30m"
  const m = s.match(/^(\d+)m$/i);
  if (m) return parseInt(m[1]);
  return null;
}

/** 分数 → "1h30m" 表示 */
function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

// ────────────────────────────────────────────
// 期限: クイック選択肢
// ────────────────────────────────────────────
const today = new Date();
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
// 今年を基準にした次回の月/日を返す（来年跨ぎは考慮しない簡易実装）
function makeDueDate(month: number, day: number): Date {
  const d = new Date(); d.setMonth(month - 1); d.setDate(day); return d;
}

const DUE_QUICK = [
  { label: "今日",   date: today },
  { label: "明日",   date: addDays(today, 1) },
  { label: "3日後",  date: addDays(today, 3) },
  { label: "来週",   date: addDays(today, 7) },
];

/** Date → "M/D" 表示 */
function fmtMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ────────────────────────────────────────────
// タスク追加モーダル
// ────────────────────────────────────────────
function AddTaskModal({ onClose }: { onClose: () => void }) {
  // ── 見積もり ──
  const [selectedMins, setSelectedMins] = useState<number | null>(null);
  const [durationRaw, setDurationRaw] = useState("");

  function handleQuickDuration(mins: number) {
    setSelectedMins(mins);
    setDurationRaw("");            // カスタム入力をクリア
  }
  function handleDurationInput(v: string) {
    setDurationRaw(v);
    setSelectedMins(null);         // クイック選択を解除
  }
  const durationMins = selectedMins ?? parseDurationInput(durationRaw);

  // ── 期限 ──
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [customMonth, setCustomMonth] = useState<string>("");
  const [customDay,   setCustomDay]   = useState<string>("");

  function handleQuickDue(d: Date) {
    setDueDate(d);
    setCustomMonth(String(d.getMonth() + 1));
    setCustomDay(String(d.getDate()));
  }
  function handleCustomDue(month: string, day: string) {
    setCustomMonth(month);
    setCustomDay(day);
    const m = parseInt(month), d = parseInt(day);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      setDueDate(makeDueDate(m, d));
    } else {
      setDueDate(null);
    }
  }

  const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition";
  const labelCls = "text-[11px] font-semibold text-slate-500 mb-1.5 block";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-6">
        <div className="w-8 h-1 rounded-full bg-slate-200 mx-auto mb-5 sm:hidden" />

        <h2 className="text-[16px] font-bold text-slate-900 mb-4">タスクを追加</h2>

        <div className="flex flex-col gap-4">

          {/* タスク名 */}
          <div>
            <label className={labelCls}>タスク名 <span className="text-red-400">*</span></label>
            <input type="text" placeholder="タスク名を入力..." autoFocus className={inputCls} />
          </div>

          {/* 詳細 */}
          <div>
            <label className={labelCls}>詳細（任意）</label>
            <textarea placeholder="タスクの詳細を入力..." rows={2}
              className={`${inputCls} resize-none`} />
          </div>

          {/* 優先度 */}
          <div>
            <label className={labelCls}>優先度</label>
            <select className={`${inputCls} bg-white`}>
              <option value="1">高</option>
              <option value="2">中</option>
              <option value="3">低</option>
            </select>
          </div>

          {/* ── 見積もり時間 ── */}
          <div>
            <label className={labelCls}>
              見積もり時間
              {durationMins !== null && (
                <span className="ml-2 text-indigo-600 font-bold">{fmtMins(durationMins)}</span>
              )}
            </label>

            {/* クイック選択チップ */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {DURATION_QUICK.map(({ label, mins }) => {
                const active = selectedMins === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleQuickDuration(mins)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                      active
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* カスタム入力: 0hOOm 形式 */}
            <input
              type="text"
              value={durationRaw}
              onChange={(e) => handleDurationInput(e.target.value)}
              placeholder="例: 1h30m　0h45m　2h"
              className={`${inputCls} ${
                durationRaw && durationMins === null
                  ? "border-red-300 ring-2 ring-red-100"  // パース失敗時
                  : ""
              }`}
            />
            {durationRaw && durationMins === null && (
              <p className="text-[10px] text-red-400 mt-1">
                形式例: 1h30m · 45m · 2h
              </p>
            )}
          </div>

          {/* ── 期限 ── */}
          <div>
            <label className={labelCls}>
              期限（任意）
              {dueDate && (
                <span className="ml-2 text-indigo-600 font-bold">{fmtMD(dueDate)}</span>
              )}
            </label>

            {/* クイック選択 */}
            <div className="flex gap-1.5 mb-2">
              {DUE_QUICK.map(({ label, date }) => {
                const active = dueDate?.toDateString() === date.toDateString();
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleQuickDue(date)}
                    className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg border transition-all active:scale-95 ${
                      active
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* カスタム: MM / DD */}
            <div className="flex items-center gap-2">
              <select
                value={customMonth}
                onChange={(e) => handleCustomDue(e.target.value, customDay)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
              >
                <option value="">月</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>

              <span className="text-slate-400 font-bold shrink-0">/</span>

              <select
                value={customDay}
                onChange={(e) => handleCustomDue(customMonth, e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
              >
                <option value="">日</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}日</option>
                ))}
              </select>

              {/* クリアボタン */}
              {dueDate && (
                <button
                  type="button"
                  onClick={() => { setDueDate(null); setCustomMonth(""); setCustomDay(""); }}
                  className="shrink-0 text-[11px] text-slate-400 hover:text-slate-600 px-2"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

        </div>

        {/* アクション */}
        <div className="flex gap-2.5 mt-6">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 text-[13px] font-semibold hover:bg-slate-200 transition-colors">
            キャンセル
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm">
            追加する
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// メインページ
// ────────────────────────────────────────────
export default function TaskListPage() {
  const [tasks] = useState<Task[]>(MOCK_TASKS);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "done">("active");

  const filtered = tasks.filter((t) => {
    if (filter === "active") return !t.is_completed;
    if (filter === "done") return t.is_completed;
    return true;
  });
  const sorted = sortTasks(filtered);

  const activeCnt = tasks.filter((t) => !t.is_completed).length;
  const doneCnt = tasks.filter((t) => t.is_completed).length;

  // AI要注意タスク数（ズレが大きいもの）
  const alertCnt = tasks.filter(
    (t) =>
      !t.is_completed &&
      t.estimated_hours != null &&
      t.ai_estimated_hours != null &&
      Math.abs(t.ai_estimated_hours - t.estimated_hours) > 0.5
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── ヘッダー ── */}
      <div className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-0">
          {/* タイトル行 */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest leading-none mb-1">
                Tasks
              </p>
              <h1 className="text-[22px] font-bold text-slate-900 leading-tight">
                タスクリスト
              </h1>
              {/* サマリー */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[12px] text-slate-500">
                  未完了 <strong className="text-slate-800">{activeCnt}</strong> 件
                </span>
                {alertCnt > 0 && (
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    ！ AI要確認 {alertCnt}件
                  </span>
                )}
              </div>
            </div>

            {/* タスク追加ボタン */}
            <button
              onClick={() => setShowAdd(true)}
              className="w-11 h-11 rounded-2xl bg-indigo-600 text-white text-[22px] font-light flex items-center justify-center shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
              aria-label="タスクを追加"
            >
              +
            </button>
          </div>

          {/* フィルタータブ */}
          <div className="flex gap-0">
            {(
              [
                { key: "active", label: "未完了", cnt: activeCnt },
                { key: "done", label: "完了済み", cnt: doneCnt },
                { key: "all", label: "すべて", cnt: tasks.length },
              ] as const
            ).map(({ key, label, cnt }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold border-b-2 transition-colors ${
                  filter === key
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {label}
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    filter === key
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {cnt}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── タスクリスト ── */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[14px] text-slate-400 font-medium">
              {filter === "done" ? "完了済みタスクはありません" : "タスクはありません"}
            </p>
            {filter === "active" && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-3 text-[12px] text-indigo-600 font-semibold hover:underline"
              >
                最初のタスクを追加する →
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sorted.map((task) => (
              <TaskListItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>

      {/* ── フローティング追加ボタン（スマホ用・lg以下で表示） ── */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-5 lg:hidden w-14 h-14 rounded-2xl bg-indigo-600 text-white text-[28px] font-light flex items-center justify-center shadow-xl hover:bg-indigo-700 active:scale-95 transition-all z-20"
        aria-label="タスクを追加"
      >
        +
      </button>

      {/* ── タスク追加モーダル ── */}
      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
