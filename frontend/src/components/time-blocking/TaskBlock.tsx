"use client";

import { useState } from "react";
import { Task } from "./types";
import {
  hexToPastel,
  hexToMedium,
  toMinutes,
  minsToLabel,
  PX_PER_MIN,
  TIMELINE_START_HOUR,
} from "./utils";

const ACHIEVEMENT_OPTIONS = [0, 30, 70, 100] as const;
const OFFSET_MINS = TIMELINE_START_HOUR * 60;

function AchievementBadge({
  value,
  onChange,
  color,
}: {
  value: number | null;
  onChange: (v: number) => void;
  color: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border transition-all"
        style={
          value !== null
            ? {
                background: hexToMedium(color, 0.7),
                color: "#fff",
                borderColor: "transparent",
              }
            : { background: "rgba(0,0,0,0.06)", color: "#888", borderColor: "transparent" }
        }
      >
        {value !== null ? `${value}%` : "達成度"}
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-50 bg-white rounded-lg shadow-xl border border-slate-100 p-1 flex gap-1">
          {ACHIEVEMENT_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className="text-[11px] px-2 py-1 rounded-md hover:bg-slate-100 font-medium transition-colors"
              style={{ color: opt === value ? color : "#555" }}
            >
              {opt}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EstimateInfo({
  estimated,
  aiEstimated,
  color,
}: {
  estimated: number | null;
  aiEstimated: number | null;
  color: string;
}) {
  const [tip, setTip] = useState(false);
  const diff =
    estimated !== null && aiEstimated !== null
      ? Math.abs(estimated - aiEstimated)
      : 0;
  const alert = diff >= 1;

  if (!estimated) return null;

  return (
    <div className="flex items-center gap-0.5 relative">
      <span
        className="text-[10px] font-medium"
        style={{ color: alert ? "#ef4444" : "#888" }}
      >
        {estimated}h
      </span>
      {alert && (
        <>
          <span
            className="text-[10px] font-bold cursor-pointer select-none"
            style={{ color: "#ef4444" }}
            onMouseEnter={() => setTip(true)}
            onMouseLeave={() => setTip(false)}
            onTouchStart={() => setTip((p) => !p)}
          >
            ！
          </span>
          {tip && (
            <div className="absolute bottom-5 right-0 z-50 bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
              AI見積もり: {aiEstimated}h
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Props = {
  task: Task;
  onAchievementChange: (id: number, v: number) => void;
};

export default function TaskBlock({ task, onAchievementChange }: Props) {
  const [draggingBottom, setDraggingBottom] = useState(false);
  const [extraMins, setExtraMins] = useState(0);

  if (!task.start_time || !task.end_time) return null;

  const startMins = toMinutes(task.start_time) - OFFSET_MINS;
  const rawEndMins = toMinutes(task.end_time) - OFFSET_MINS;
  const endMins = rawEndMins + extraMins;
  const durationMins = endMins - startMins;

  const top = startMins * PX_PER_MIN;
  const height = Math.max(durationMins * PX_PER_MIN, 28);

  const color = task.category?.color ?? "#94a3b8";
  const bg = task.is_completed ? hexToPastel(color, 0.07) : hexToPastel(color, 0.22);
  const borderColor = hexToMedium(color, task.is_completed ? 0.2 : 0.5);
  const isCompleted = task.is_completed || task.achievement_rate === 100;

  // Current-time glow check
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes() - OFFSET_MINS;
  const isActive = nowMins >= startMins && nowMins < rawEndMins;

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const onMove = (me: MouseEvent) => {
      const delta = Math.round((me.clientY - startY) / PX_PER_MIN / 5) * 5;
      setExtraMins(Math.max(-durationMins + 15, delta));
    };
    const onUp = () => {
      setDraggingBottom(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    setDraggingBottom(true);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className="absolute left-0 right-0 mx-1 rounded-lg border transition-shadow select-none"
      style={{
        top,
        height,
        background: bg,
        borderColor,
        borderWidth: "1px",
        boxShadow: isActive
          ? `0 0 0 2px ${hexToMedium(color, 0.4)}, 0 0 12px ${hexToMedium(color, 0.25)}`
          : "0 1px 3px rgba(0,0,0,0.06)",
        opacity: isCompleted ? 0.65 : 1,
        cursor: "grab",
        zIndex: draggingBottom ? 20 : 10,
      }}
    >
      <div className="flex h-full px-2 py-1 gap-1 overflow-hidden">
        {/* Left: times */}
        <div className="flex flex-col justify-between shrink-0 min-w-[34px]">
          <span className="text-[9px] font-semibold text-slate-500 leading-none">
            {minsToLabel(startMins + OFFSET_MINS)}
          </span>
          {height > 36 && (
            <span className="text-[9px] font-semibold text-slate-400 leading-none">
              {minsToLabel(endMins + OFFSET_MINS)}
            </span>
          )}
        </div>

        {/* Center: title + duration */}
        <div className="flex-1 flex flex-col justify-center min-w-0 overflow-hidden">
          <span
            className="text-[13px] font-bold leading-tight truncate"
            style={{
              color: isCompleted ? "#94a3b8" : "#1e293b",
              textDecoration: isCompleted ? "line-through" : "none",
              textDecorationColor: "#94a3b8",
            }}
          >
            {task.title}
          </span>
          {height > 44 && (
            <span className="text-[10px] text-slate-400 mt-0.5 leading-none">
              {Math.round(durationMins / 60 * 10) / 10}h
              {task.category && (
                <span
                  className="ml-1.5 px-1 rounded-sm text-[9px] font-medium"
                  style={{
                    background: hexToPastel(color, 0.35),
                    color: hexToMedium(color, 0.9),
                  }}
                >
                  {task.category.name}
                </span>
              )}
            </span>
          )}
        </div>

        {/* Right: achievement + estimate */}
        <div className="flex flex-col justify-between items-end shrink-0">
          <AchievementBadge
            value={task.achievement_rate}
            onChange={(v) => onAchievementChange(task.id, v)}
            color={color}
          />
          {height > 40 && (
            <EstimateInfo
              estimated={task.estimated_hours}
              aiEstimated={task.ai_estimated_hours}
              color={color}
            />
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-3 flex items-center justify-center cursor-row-resize group"
        onMouseDown={handleResizeStart}
      >
        <div className="w-5 h-0.5 rounded-full bg-slate-300 group-hover:bg-slate-500 transition-colors" />
      </div>
    </div>
  );
}
