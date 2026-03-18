"use client";

import { useState } from "react";
import { Task } from "./types";
import { MOCK_TASKS } from "./mock-data";
import { sortTasks } from "./utils";
import TaskListItem from "./TaskListItem";

// ────────────────────────────────────────────
// タスク追加モーダル
// ────────────────────────────────────────────
function AddTaskModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-6">
        <div className="w-8 h-1 rounded-full bg-slate-200 mx-auto mb-5 sm:hidden" />

        <h2 className="text-[16px] font-bold text-slate-900 mb-5">
          タスクを追加
        </h2>

        <div className="flex flex-col gap-3">
          {/* タスク名 */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
              タスク名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="タスク名を入力..."
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
            />
          </div>

          {/* 詳細 */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
              詳細（任意）
            </label>
            <textarea
              placeholder="タスクの詳細を入力..."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition resize-none"
            />
          </div>

          {/* 優先度 + 見積もり */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                優先度
              </label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition">
                <option value="1">高</option>
                <option value="2" selected>中</option>
                <option value="3">低</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                見積もり（h）
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                placeholder="例: 2"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
            </div>
          </div>

          {/* 期限 */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
              期限（任意）
            </label>
            <input
              type="date"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2.5 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 text-[13px] font-semibold hover:bg-slate-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm"
          >
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
