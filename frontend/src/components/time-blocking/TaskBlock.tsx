"use client";

import { useState, useRef, useEffect } from "react";
import { Task } from "./types";
import {
  PX_PER_MIN,
  isoToTop,
  isoToLabel,
  hexToPastel,
  hexToMedium,
} from "./utils";

const ACHIEVEMENT_OPTIONS = [0, 30, 70, 100] as const;

type Props = {
  task: Task;
  onAchievementChange: (id: number, value: number) => void;
};

// ────────────────────────────────────────────
// 達成度セグメントコントロール（常に横並び・コンパクト固定）
// ────────────────────────────────────────────
function AchievementSegment({
  taskId,
  value,
  borderColor,
  accentColor,
  metaColor,
  onChange,
}: {
  taskId: number;
  value: number | null;
  borderColor: string;
  accentColor: string;
  metaColor: string;
  onChange: (id: number, v: number) => void;
}) {
  return (
    // rounded-md + overflow-hidden で両端だけ角丸になる繋がったボタン群
    <div
      className="flex rounded-md overflow-hidden shrink-0"
      role="group"
      aria-label="達成度"
      style={{ border: `1px solid ${borderColor}` }}
    >
      {ACHIEVEMENT_OPTIONS.map((opt, i) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(taskId, opt)}
            className="text-[8px] font-bold px-1.5 py-0.5 leading-none transition-colors active:scale-95"
            style={{
              borderLeft: i > 0 ? `1px solid ${borderColor}` : "none",
              background: active ? accentColor : "transparent",
              color: active ? "#fff" : metaColor,
            }}
          >
            {/* 100% は ✓ に省略してスペースを節約 */}
            {opt === 100 ? "✓" : opt}
          </button>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────
// AIアラートポップオーバー（TaskListItem と同じUI）
// ────────────────────────────────────────────
function AiAlertPopover({
  task,
  aiDiff,
  isHighAlert,
}: {
  task: Task;
  aiDiff: number; // 符号付き: ai - estimated
  isHighAlert: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 外クリックで閉じる
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  async function handleRetry() {
    setRetrying(true);
    console.log(`[API] POST /ai/estimate/${task.id}/retry`);
    await new Promise((r) => setTimeout(r, 1200));
    setRetrying(false);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      {/* トリガーボタン */}
      <button
        onClick={() => setOpen((p) => !p)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`text-[10px] font-extrabold px-1 py-0.5 rounded leading-none transition-all hover:scale-105 active:scale-95 ${
          isHighAlert
            ? "text-red-600 bg-red-50 hover:bg-red-100"
            : "text-amber-600 bg-amber-50 hover:bg-amber-100"
        }`}
        aria-label="AI見積もりとの乖離を確認"
      >
        ！
      </button>

      {/* ポップオーバー本体 */}
      {open && (
        <div
          className="absolute right-0 bottom-7 z-50 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl p-3"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {/* 吹き出し三角（下向き） */}
          <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-white border-b border-r border-slate-200 rotate-45" />

          <p className="text-[11px] font-bold text-slate-700 mb-2">AIの見積もり</p>

          {/* あなた vs AI 比較 */}
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
                aiDiff > 0 ? "text-amber-700 bg-amber-50" : "text-blue-700 bg-blue-50"
              }`}
            >
              {aiDiff > 0 ? "+" : ""}
              {aiDiff.toFixed(1)}h
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
  );
}

// ────────────────────────────────────────────
// タスクブロック本体
// ────────────────────────────────────────────
export default function TaskBlock({ task, onAchievementChange }: Props) {
  if (!task.start_time || !task.end_time) return null;

  const top = isoToTop(task.start_time);
  const startLabel = isoToLabel(task.start_time);
  const endLabel = isoToLabel(task.end_time);

  const durationMins =
    (new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) /
    60000;
  const height = Math.max(durationMins * PX_PER_MIN, 36);

  const color = task.category?.color ?? "#94a3b8";
  const bgColor = hexToPastel(color, task.is_completed ? 0.07 : 0.2);
  const borderColor = hexToMedium(color, task.is_completed ? 0.2 : 0.45);
  const accentColor = hexToMedium(color, 0.75);
  const titleColor = task.is_completed ? "#94a3b8" : "#0f172a";
  const metaColor = task.is_completed ? "#cbd5e1" : "#475569";

  // 符号付きの差分（TaskListItem と同じ計算）
  const aiDiff =
    task.estimated_hours != null && task.ai_estimated_hours != null
      ? task.ai_estimated_hours - task.estimated_hours
      : null;
  const hasAiAlert = aiDiff !== null && Math.abs(aiDiff) > 0.5;
  const isHighAlert = aiDiff !== null && Math.abs(aiDiff) >= 1.5;

  const now = new Date();
  const isActive =
    !task.is_completed &&
    now >= new Date(task.start_time) &&
    now <= new Date(task.end_time);

  const isCompact = height < 52;

  return (
    <div
      // flex-col にして内部の行を縦積みで管理
      className="absolute left-0 right-1 rounded-xl overflow-visible transition-all flex flex-col"
      style={{
        top,
        height,
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        boxShadow: isActive
          ? `0 0 0 2px ${hexToMedium(color, 0.35)}, 0 0 14px ${hexToPastel(color, 0.5)}`
          : "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* ── 上段: 時刻・タイトル・セグメント ── */}
      <div className="flex items-start min-w-0 px-2 pt-1.5 gap-1.5">

        {/* 左: 時刻 */}
        <div className="flex flex-col shrink-0 w-9 gap-0.5">
          <span className="text-[10px] font-semibold leading-none" style={{ color: metaColor }}>
            {startLabel}
          </span>
          {!isCompact && (
            <span className="text-[9px] leading-none" style={{ color: metaColor, opacity: 0.7 }}>
              {endLabel}
            </span>
          )}
        </div>

        {/* 中央: タイトル */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[12px] font-bold leading-snug"
            style={{
              color: titleColor,
              textDecoration: task.is_completed ? "line-through" : "none",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: isCompact ? 1 : 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {task.title}
          </p>
        </div>

        {/* 右: 達成度セグメントコントロール（常に表示・コンパクト固定） */}
        <AchievementSegment
          taskId={task.id}
          value={task.achievement_rate}
          borderColor={borderColor}
          accentColor={accentColor}
          metaColor={metaColor}
          onChange={onAchievementChange}
        />
      </div>

      {/* ── 下段: 見込み時間 + AIアラート（通常ブロックのみ） ── */}
      {!isCompact && (
        <div className="flex items-center gap-1.5 px-2 pb-1 mt-0.5">
          {task.estimated_hours != null && (
            <span
              className="text-[11px] font-bold leading-none"
              style={{ color: hasAiAlert ? "#d97706" : accentColor }}
            >
              {task.estimated_hours}h
            </span>
          )}
          {hasAiAlert && aiDiff !== null && (
            <AiAlertPopover
              task={task}
              aiDiff={aiDiff}
              isHighAlert={isHighAlert}
            />
          )}
        </div>
      )}

      {/* リサイズハンドル */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2.5 cursor-row-resize flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="w-8 h-0.5 rounded-full bg-slate-400 opacity-50" />
      </div>
    </div>
  );
}
