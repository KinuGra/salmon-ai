"use client";

import React, { useRef, useEffect } from "react";
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
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const onTouchDropRef = useRef(onTouchDrop);
  useEffect(() => { onTouchDropRef.current = onTouchDrop; }, [onTouchDrop]);

  useEffect(() => {
    const el = chipRef.current;
    if (!el) return;
    let active = false, startX = 0, startY = 0, offsetX = 0, offsetY = 0, pid = -1;

    function onDown(e: PointerEvent) {
      if (e.pointerType === "mouse") return;
      const rect = el.getBoundingClientRect();
      active = false; pid = e.pointerId;
      offsetX = Math.round(e.clientX - rect.left);
      offsetY = Math.round(e.clientY - rect.top);
      startX = e.clientX; startY = e.clientY;
    }

    function onMove(e: PointerEvent) {
      if (e.pointerId !== pid) return;
      if (!active) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < 8) return;
        active = true;
        el.setPointerCapture(pid);
        const rect = el.getBoundingClientRect();
        const clone = el.cloneNode(true) as HTMLElement;
        const tx = e.clientX - offsetX, ty = e.clientY - offsetY;
        clone.style.cssText = `position:fixed;left:0;top:0;width:${rect.width}px;height:${rect.height}px;opacity:0.75;pointer-events:none;z-index:9999;border-radius:8px;transform:translate(${tx}px,${ty}px) scale(1.03);transform-origin:top left;box-shadow:0 8px 24px rgba(0,0,0,0.15);transition:none;`;
        document.body.appendChild(clone);
        ghostRef.current = clone;
        const durationMins = task.estimated_hours ? Math.round(task.estimated_hours * 60) : 30;
        (window as any).__dragInfo = { durationMins, grabOffset: 0 };
      }
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate(${e.clientX - offsetX}px,${e.clientY - offsetY}px) scale(1.03)`;
      }
    }

    function onUp(e: PointerEvent) {
      if (e.pointerId !== pid) return;
      const wasActive = active;
      active = false; pid = -1;
      if (ghostRef.current) { document.body.removeChild(ghostRef.current); ghostRef.current = null; }
      if (wasActive) onTouchDropRef.current?.(task.id, e.clientY, "inbox");
    }

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      if (ghostRef.current) { document.body.removeChild(ghostRef.current); ghostRef.current = null; }
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [task.id, task.estimated_hours]);

  function handleDragStart(e: React.DragEvent) {
    // D&D でドロップ先にタスクIDを渡す
    e.dataTransfer.setData("taskId", String(task.id));
    e.dataTransfer.effectAllowed = "move";
    // dragover 中に dataTransfer.getData が使えないため window に退避
    const durationMins = task.estimated_hours ? Math.round(task.estimated_hours * 60) : 30;
    (window as any).__dragInfo = { durationMins, grabOffset: 0 };
  }
  const color = task.category?.color ?? "#94a3b8";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = task.due_date ? new Date(task.due_date) : null;
  if (due) due.setHours(0, 0, 0, 0);
  const isOverdue = due && due < today;
  const isDueToday = due && due.getTime() === today.getTime();

  return (
    <div
      ref={chipRef}
      draggable
      onDragStart={handleDragStart}
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
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 active:scale-90 transition-all"
            aria-label="タスクを編集"
          >
            <span className="text-[12px] text-slate-400 leading-none">✎</span>
          </button>
        )}
      </div>
    </div>
  );
}
