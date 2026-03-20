"use client";

import { useState } from "react";
import { Task } from "./types";
import { InboxChip, sortInbox } from "./inbox-shared";
import { useInboxDropZone } from "./useInboxDropZone";

type Props = {
  tasks: Task[];
  onReturnToInbox: (taskId: number) => void;
  onEdit?: (task: Task) => void;
};

export default function InboxDrawer({ tasks, onReturnToInbox, onEdit }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { isDragOver, handleDragOver, handleDragLeave, handleDrop } =
    useInboxDropZone({ onReturnToInbox });
  const sorted = sortInbox(tasks);

  return (
    // lg+ では InboxSidebar が右カラムに表示されるためDrawerは非表示
    <div
      className="fixed bottom-16 left-0 right-0 z-30 transition-all duration-300 ease-out lg:hidden"
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
              <InboxChip key={t.id} task={t} onEdit={onEdit} />
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
              sorted.map((t) => <InboxChip key={t.id} task={t} onEdit={onEdit} />)
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
