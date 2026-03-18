"use client";

import { useState } from "react";
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

export default function TaskBlock({ task, onAchievementChange }: Props) {
  const [showAiTip, setShowAiTip] = useState(false);

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

  // ⑥ コントラスト: タイトルは常に slate-900 固定、完了時のみ薄く
  const titleColor = task.is_completed ? "#94a3b8" : "#0f172a"; // slate-900
  const metaColor = task.is_completed ? "#cbd5e1" : "#475569"; // slate-600

  // AI見積もりとのズレが0.5h超でアラート
  const aiDiff =
    task.estimated_hours != null && task.ai_estimated_hours != null
      ? Math.abs(task.estimated_hours - task.ai_estimated_hours)
      : 0;
  const hasAiAlert = aiDiff > 0.5;

  // 現在進行中ハイライト
  const now = new Date();
  const isActive =
    !task.is_completed &&
    now >= new Date(task.start_time) &&
    now <= new Date(task.end_time);

  // ブロックの高さに応じてUIを切り替え
  const isCompact = height < 52;

  return (
    <div
      className="absolute left-0 right-1 rounded-xl overflow-visible transition-all"
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
      <div className="flex h-full px-2 py-1.5 gap-1.5 min-w-0 overflow-hidden">

        {/* 左: 時刻 */}
        <div className="flex flex-col justify-between shrink-0 w-9">
          <span className="text-[10px] font-semibold leading-none" style={{ color: metaColor }}>
            {startLabel}
          </span>
          {!isCompact && (
            <span className="text-[9px] leading-none" style={{ color: metaColor, opacity: 0.7 }}>
              {endLabel}
            </span>
          )}
        </div>

        {/* 中央: タイトル + 所要時間 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <p
            className="text-[13px] font-bold leading-snug"
            style={{
              color: titleColor,
              textDecoration: task.is_completed ? "line-through" : "none",
              // 長いタイトルはブロック高さが十分ならwrap、小さければ切る
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: isCompact ? 1 : 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {task.title}
          </p>

          {/* ⑤ 見込み時間を大きく */}
          {!isCompact && (
            <div className="flex items-center gap-1.5">
              {task.estimated_hours != null && (
                <span
                  className="text-[12px] font-bold leading-none"
                  style={{ color: hasAiAlert ? "#d97706" : accentColor }}
                >
                  {task.estimated_hours}h
                </span>
              )}
              {hasAiAlert && (
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowAiTip(true)}
                    onMouseLeave={() => setShowAiTip(false)}
                    onTouchStart={() => setShowAiTip((p) => !p)}
                    className="text-[13px] font-extrabold text-amber-500 leading-none hover:text-amber-600 transition-colors"
                    aria-label="AI見積もりとのズレ"
                  >
                    ！
                  </button>
                  {showAiTip && (
                    <div className="absolute bottom-6 left-0 z-50 bg-slate-800 text-white text-[11px] rounded-lg px-2.5 py-2 whitespace-nowrap shadow-xl">
                      <p className="font-semibold mb-0.5">AI見積もり</p>
                      <p>{task.ai_estimated_hours}h（差: {aiDiff.toFixed(1)}h）</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右: ④ 達成度セグメントコントロール */}
        <div className="flex flex-col justify-start items-end shrink-0 pt-0.5">
          {isCompact ? (
            /* コンパクト: 現在値だけ表示、タップでサイクル */
            <button
              onClick={() => {
                const idx = ACHIEVEMENT_OPTIONS.indexOf(
                  (task.achievement_rate ?? 0) as (typeof ACHIEVEMENT_OPTIONS)[number]
                );
                const next = ACHIEVEMENT_OPTIONS[(idx + 1) % ACHIEVEMENT_OPTIONS.length];
                onAchievementChange(task.id, next);
              }}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none"
              style={{
                background: accentColor,
                color: "#fff",
              }}
            >
              {task.achievement_rate ?? 0}%
            </button>
          ) : (
            /* 通常: セグメントコントロール形式 */
            <div
              className="flex flex-col gap-0.5"
              role="group"
              aria-label="達成度"
            >
              {ACHIEVEMENT_OPTIONS.map((opt) => {
                const active = task.achievement_rate === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => onAchievementChange(task.id, opt)}
                    className="text-[10px] font-bold rounded-md px-1.5 py-1 leading-none transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: active ? accentColor : hexToPastel(color, 0.25),
                      color: active ? "#fff" : metaColor,
                      border: active ? "none" : `1px solid ${borderColor}`,
                      minWidth: "2rem",
                    }}
                  >
                    {opt}%
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
