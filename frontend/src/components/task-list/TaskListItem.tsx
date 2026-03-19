"use client";

import { useState, useRef, useEffect } from "react";
import { Task } from "./types";
import {
  hexToPastel,
  hexToSolid,
  PRIORITY_META,
  dueDateMeta,
} from "./utils";

type Props = { task: Task; onEdit?: () => void };

export default function TaskListItem({ task, onEdit }: Props) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const color = task.category?.color ?? "#94a3b8";
  const priority = PRIORITY_META[task.priority] ?? PRIORITY_META[3];
  const due = dueDateMeta(task.due_date);

  const aiDiff =
    task.estimated_hours != null && task.ai_estimated_hours != null
      ? task.ai_estimated_hours - task.estimated_hours
      : null;
  // 0.5h 超のズレでアラート、1.5h 超で警告レベルを強める
  const hasAlert = aiDiff !== null && Math.abs(aiDiff) > 0.5;
  const isHighAlert = aiDiff !== null && Math.abs(aiDiff) >= 1.5;

  // ポップオーバーの外クリックで閉じる
  useEffect(() => {
    if (!popoverOpen) return;
    function onOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [popoverOpen]);

  // 再見積もりモック（POST /ai/estimate/:id/retry）
  async function handleRetry() {
    setRetrying(true);
    // TODO: 本番では TanStack Query の mutation に置き換える
    console.log(`[API] POST /ai/estimate/${task.id}/retry`);
    await new Promise((r) => setTimeout(r, 1200)); // モック待機
    setRetrying(false);
    setPopoverOpen(false);
  }

  return (
    <div
      onClick={!task.is_completed ? onEdit : undefined}
      className={`group relative flex items-stretch bg-white rounded-xl border transition-all hover:shadow-md ${
        task.is_completed
          ? "border-slate-100 opacity-60"
          : "border-slate-200 hover:border-slate-300 cursor-pointer"
      }`}
    >
      {/* カテゴリカラーバー（左端） */}
      <div
        className="w-1 shrink-0 rounded-l-xl"
        style={{ background: hexToSolid(color, task.is_completed ? 0.3 : 0.7) }}
      />

      {/* メインコンテンツ */}
      <div className="flex-1 min-w-0 px-4 py-3.5 flex gap-3 items-start">

        {/* 左: テキスト情報 */}
        <div className="flex-1 min-w-0">
          {/* タイトル行 */}
          <p
            className={`text-[14px] font-bold text-slate-900 leading-snug ${
              task.is_completed ? "line-through text-slate-400" : ""
            }`}
          >
            {task.title}
          </p>

          {/* 詳細テキスト */}
          {task.description && (
            <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}

          {/* メタ情報: 優先度 + 期限 + カテゴリ */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* 優先度バッジ */}
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none"
              style={{
                color: priority.color,
                background: priority.bg,
              }}
            >
              {priority.label}優先
            </span>

            {/* 期限 */}
            {due && (
              <span
                className="text-[11px] font-semibold leading-none"
                style={{ color: due.color }}
              >
                {due.label}
              </span>
            )}

            {/* カテゴリタグ */}
            {task.category && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none"
                style={{
                  background: hexToPastel(color, 0.18),
                  color: hexToSolid(color, 0.85),
                }}
              >
                {task.category.name}
              </span>
            )}
          </div>
        </div>

        {/* 右: 工数 + AIアラート */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
          {/* 自分の見積もり */}
          {task.estimated_hours != null && (
            <span
              className={`text-[16px] font-bold leading-none tabular-nums ${
                hasAlert
                  ? isHighAlert
                    ? "text-red-500"
                    : "text-amber-500"
                  : "text-slate-700"
              }`}
            >
              {task.estimated_hours}
              <span className="text-[10px] font-semibold ml-0.5 opacity-70">h</span>
            </span>
          )}

          {/* AIアラートトリガー */}
          {hasAlert && (
            <div ref={popoverRef} className="relative">
              <button
                onClick={() => setPopoverOpen((p) => !p)}
                onMouseEnter={() => setPopoverOpen(true)}
                onMouseLeave={() => !popoverOpen && setPopoverOpen(false)}
                className={`flex items-center gap-0.5 text-[11px] font-extrabold leading-none px-1.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95 ${
                  isHighAlert
                    ? "text-red-600 bg-red-50 hover:bg-red-100"
                    : "text-amber-600 bg-amber-50 hover:bg-amber-100"
                }`}
                aria-label="AI見積もりとの乖離を確認"
              >
                ！
              </button>

              {/* ポップオーバー */}
              {popoverOpen && (
                <div
                  className="absolute right-0 top-8 z-50 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl p-3"
                  onMouseEnter={() => setPopoverOpen(true)}
                  onMouseLeave={() => setPopoverOpen(false)}
                >
                  {/* 吹き出し三角 */}
                  <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-t border-l border-slate-200 rotate-45" />

                  <p className="text-[11px] font-bold text-slate-700 mb-2">
                    AIの見積もり
                  </p>

                  {/* 比較 */}
                  <div className="flex items-end justify-between mb-3">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 mb-0.5">あなた</p>
                      <p className="text-[18px] font-bold text-slate-800 leading-none tabular-nums">
                        {task.estimated_hours}
                        <span className="text-[10px] ml-0.5">h</span>
                      </p>
                    </div>
                    <div
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        (aiDiff ?? 0) > 0
                          ? "text-amber-700 bg-amber-50"
                          : "text-blue-700 bg-blue-50"
                      }`}
                    >
                      {(aiDiff ?? 0) > 0 ? "+" : ""}
                      {aiDiff?.toFixed(1)}h
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 mb-0.5">AI</p>
                      <p
                        className={`text-[18px] font-bold leading-none tabular-nums ${
                          isHighAlert ? "text-red-500" : "text-amber-500"
                        }`}
                      >
                        {task.ai_estimated_hours}
                        <span className="text-[10px] ml-0.5">h</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                    {isHighAlert
                      ? "大幅な乖離があります。見積もりの見直しを推奨します。"
                      : "やや差があります。余裕を持った計画を検討してください。"}
                  </p>

                  {/* 再見積もりボタン */}
                  <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="w-full py-2 rounded-xl text-[11px] font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    {retrying ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        再見積もり中...
                      </>
                    ) : (
                      "✦ 再見積もり"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI見積もりなし・ズレなし */}
          {!hasAlert && task.ai_estimated_hours != null && (
            <span className="text-[9px] text-slate-300 font-medium leading-none">
              AI {task.ai_estimated_hours}h
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
