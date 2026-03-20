"use client";

import React, { useRef } from "react";
import { useTouchDrag } from "./useTouchDrag";
import { useDragContext } from "./DragContext";
import { Task } from "./types";
import { hexToPastel, hexToMedium } from "./utils";

export const PRIORITY_LABEL: Record<number, string> = { 1: "高", 2: "中", 3: "低" };
export const PRIORITY_COLOR: Record<number, string> = {
  1: "#ef4444",
  2: "#f59e0b",
  3: "#94a3b8",
};

export function sortInbox(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

export function InboxChip({
  task,
  onEdit,
  onTouchDrop,
}: {
  task: Task;
  onEdit?: (task: Task) => void;
  onTouchDrop?: (taskId: number, clientY: number, dragType: "scheduled" | "inbox") => void;
}) {
  const chipRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const { dragInfoRef } = useDragContext();

  const { ghostPortal } = useTouchDrag({
    elementRef: chipRef,
    onDragStart: (meta) => { dragInfoRef.current = meta; },
    onDrop: (_, clientY) => {
      didDragRef.current = true;
      onTouchDrop?.(task.id, clientY, "inbox");
    },
    getDragMeta: () => ({
      durationMins: task.estimated_hours ? Math.round(task.estimated_hours * 60) : 30,
    }),
    borderRadius: "8px",
    freeX: true,
  });

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("taskId", String(task.id));
    e.dataTransfer.effectAllowed = "move";
    const durationMins = task.estimated_hours ? Math.round(task.estimated_hours * 60) : 30;
    dragInfoRef.current = { durationMins, grabOffset: 0 };
  }

  const color = task.category?.color ?? "#94a3b8";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = task.due_date ? new Date(task.due_date) : null;
  if (due) due.setHours(0, 0, 0, 0);
  const isOverdue = due && due < today;
  const isDueToday = due && due.getTime() === today.getTime();

  return (
    <>
      {ghostPortal}
      <div
        ref={chipRef}
        draggable
        onDragStart={handleDragStart}
        onClick={() => {
          if (didDragRef.current) { didDragRef.current = false; return; }
          onEdit?.(task);
        }}
        style={{ touchAction: "none", background: hexToPastel(color, 0.15), borderColor: hexToMedium(color, 0.3) }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: PRIORITY_COLOR[task.priority] }}
        />
        <span className="text-[12px] font-semibold text-slate-700 flex-1 truncate leading-none">
          {task.title}
        </span>
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
    </>
  );
}
