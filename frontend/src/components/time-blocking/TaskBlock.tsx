"use client";

import { useState } from "react";
import { Task } from "./types";
import {
  PX_PER_MIN,
  TIMELINE_START_HOUR,
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
  const height = Math.max(durationMins * PX_PER_MIN, 32);

  const color = task.category?.color ?? "#94a3b8";
  const bgColor = hexToPastel(color, task.is_completed ? 0.08 : 0.18);
  const borderColor = hexToMedium(color, task.is_completed ? 0.2 : 0.4);
  const textColor = hexToMedium(color, task.is_completed ? 0.4 : 0.85);

  // AI見積もりとのズレが0.5h超でアラート
  const aiDiff =
    task.estimated_hours != null && task.ai_estimated_hours != null
      ? Math.abs(task.estimated_hours - task.ai_estimated_hours)
      : 0;
  const hasAiAlert = aiDiff > 0.5;

  // 現在時刻との比較でハイライト
  const now = new Date();
  const start = new Date(task.start_time);
  const end = new Date(task.end_time);
  const isActive = !task.is_completed && now >= start && now <= end;

  return (
    <div
      className="absolute left-0 right-1 rounded-lg overflow-hidden transition-all"
      style={{
        top,
        height,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        boxShadow: isActive
          ? `0 0 0 2px ${hexToMedium(color, 0.3)}, 0 0 12px ${hexToPastel(color, 0.4)}`
          : undefined,
      }}
    >
      <div className="flex h-full px-1.5 py-1 gap-1 min-w-0">
        {/* 左: 時刻 */}
        <div className="flex flex-col justify-between shrink-0 w-8">
          <span className="text-[9px] font-medium leading-none" style={{ color: textColor }}>
            {startLabel}
          </span>
          {height > 40 && (
            <span className="text-[9px] leading-none" style={{ color: hexToMedium(color, 0.45) }}>
              {endLabel}
            </span>
          )}
        </div>

        {/* 中央: タイトル + 時間 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p
            className="text-[12px] font-bold leading-snug truncate"
            style={{
              color: textColor,
              textDecoration: task.is_completed ? "line-through" : undefined,
              opacity: task.is_completed ? 0.6 : 1,
            }}
          >
            {task.title}
          </p>
          {height > 44 && (
            <p className="text-[10px] leading-none mt-0.5" style={{ color: hexToMedium(color, 0.5) }}>
              {Math.round(durationMins / 6) / 10}h
            </p>
          )}
        </div>

        {/* 右: 達成度 + AI見積もりアラート */}
        <div className="flex flex-col justify-between items-end shrink-0">
          {/* 達成度ボタン群 */}
          <div className="flex gap-0.5 flex-wrap justify-end">
            {ACHIEVEMENT_OPTIONS.map((opt) => {
              const active = task.achievement_rate === opt;
              return (
                <button
                  key={opt}
                  onClick={() => onAchievementChange(task.id, opt)}
                  className="text-[8px] font-bold rounded px-1 py-0.5 leading-none transition-all"
                  style={{
                    background: active ? hexToMedium(color, 0.7) : hexToPastel(color, 0.2),
                    color: active ? "#fff" : hexToMedium(color, 0.6),
                  }}
                >
                  {opt}%
                </button>
              );
            })}
          </div>

          {/* AI見積もりアラート */}
          {hasAiAlert && (
            <div className="relative">
              <button
                onMouseEnter={() => setShowAiTip(true)}
                onMouseLeave={() => setShowAiTip(false)}
                onTouchStart={() => setShowAiTip((p) => !p)}
                className="text-[10px] font-bold text-amber-500 leading-none"
              >
                ！
              </button>
              {showAiTip && (
                <div className="absolute bottom-5 right-0 z-50 bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  AI見積: {task.ai_estimated_hours}h
                </div>
              )}
            </div>
          )}

          {/* 自分の見積もり */}
          {task.estimated_hours != null && height > 32 && (
            <span
              className="text-[9px] leading-none font-medium"
              style={{ color: hasAiAlert ? "#f59e0b" : hexToMedium(color, 0.5) }}
            >
              {task.estimated_hours}h
            </span>
          )}
        </div>
      </div>

      {/* リサイズハンドル */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={(e) => e.preventDefault()} // ドラッグプレースホルダー
      >
        <div className="w-8 h-0.5 rounded-full bg-current opacity-40" style={{ color: textColor }} />
      </div>
    </div>
  );
}
