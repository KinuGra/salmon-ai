"use client";

import { useState } from "react";
import { Task } from "./types";
import { hexToPastel, hexToMedium } from "./utils";
import { useInboxDropZone } from "./useInboxDropZone";

const PRIORITY_LABEL: Record<number, string> = { 1: "高", 2: "中", 3: "低" };
const PRIORITY_COLOR: Record<number, string> = {
  1: "#ef4444",
  2: "#f59e0b",
  3: "#94a3b8",
};

function InboxChip({ task }: { task: Task }) {
  const color = task.category?.color ?? "#94a3b8";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = task.due_date ? new Date(task.due_date) : null;
  if (due) due.setHours(0, 0, 0, 0);
  const isOverdue = due && due < today;
  const isDueToday = due && due.getTime() === today.getTime();

  return (
    <div
      draggable
      className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
      style={{
        background: hexToPastel(color, 0.15),
        borderColor: hexToMedium(color, 0.3),
      }}
    >
      {/* Priority dot */}
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: PRIORITY_COLOR[task.priority] }}
      />

      {/* Title */}
      <span className="text-[12px] font-semibold text-slate-700 flex-1 truncate leading-none">
        {task.title}
      </span>

      {/* Meta */}
      <div className="flex items-center gap-1.5 shrink-0">
        {task.estimated_hours && (
          <span className="text-[10px] text-slate-400">{task.estimated_hours}h</span>
        )}
        {task.category && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: hexToPastel(color, 0.3),
              color: hexToMedium(color, 0.95),
            }}
          >
            {task.category.name}
          </span>
        )}
        {(isOverdue || isDueToday) && (
          <span
            className="text-[9px] font-bold"
            style={{ color: isOverdue ? "#ef4444" : "#f59e0b" }}
          >
            {isOverdue ? "期限切" : "今日"}
          </span>
        )}
        <span
          className="text-[9px] font-bold"
          style={{ color: PRIORITY_COLOR[task.priority] }}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
      </div>
    </div>
  );
}

function sortInbox(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

type Props = {
  tasks: Task[];
  onReturnToInbox: (taskId: number) => void;
};

export default function InboxDrawer({ tasks, onReturnToInbox }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { isDragOver, handleDragOver, handleDragLeave, handleDrop } =
    useInboxDropZone({ onReturnToInbox });
  const sorted = sortInbox(tasks);

  return (
    // lg+ では InboxSidebar が右カラムに表示されるためDrawerは非表示
    <div
      className="fixed bottom-0 left-0 right-0 z-30 transition-all duration-300 ease-out lg:hidden"
      style={{ maxWidth: 480, margin: "0 auto" }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Handle + header */}
      <div
        className={`backdrop-blur-sm border-t rounded-t-2xl shadow-2xl transition-colors ${
          isDragOver
            ? "bg-indigo-50/95 border-indigo-300"
            : "bg-white/95 border-slate-200"
        }`}
        style={{ boxShadow: "0 -8px 32px rgba(0,0,0,0.1)" }}
      >
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex flex-col items-center pt-2 pb-3 px-4"
        >
          <div className="w-8 h-1 rounded-full bg-slate-300 mb-3" />
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-slate-700">インボックス</span>
              <span className="text-[11px] font-semibold text-white bg-slate-400 rounded-full px-1.5 py-0.5 leading-none">
                {sorted.length}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {expanded ? "閉じる ↓" : "タップで展開 ↑"}
            </span>
          </div>
        </button>

        {/* Peek row (always visible) */}
        {!expanded && sorted.length > 0 && (
          <div className="px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-none">
            {sorted.slice(0, 4).map((t) => (
              <InboxChip key={t.id} task={t} />
            ))}
          </div>
        )}

        {/* Full list */}
        {expanded && (
          <div className="px-4 pb-6 flex flex-col gap-2 max-h-72 overflow-y-auto">
            {sorted.length === 0 ? (
              <p className="text-center text-slate-400 text-[12px] py-4">
                未配置のタスクはありません
              </p>
            ) : (
              sorted.map((t) => <InboxChip key={t.id} task={t} />)
            )}
            <p className="text-center text-[10px] text-slate-300 pt-1">
              ドラッグしてタイムラインに配置
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
