"use client";

import { Task } from "./types";
import { InboxChip, sortInbox } from "./inbox-shared";
import { useInboxDropZone } from "./useInboxDropZone";

type Props = {
  tasks: Task[];
  onReturnToInbox: (taskId: number) => void;
  onEdit?: (task: Task) => void;
};

export default function InboxSidebar({ tasks, onReturnToInbox, onEdit }: Props) {
  const { isDragOver, handleDragOver, handleDragLeave, handleDrop } =
    useInboxDropZone({ onReturnToInbox });
  const sorted = sortInbox(tasks);

  return (
    // hidden on mobile, visible as a fixed-width column on lg+
    <aside
      className={`hidden lg:flex flex-col w-80 shrink-0 border-l border-slate-200 bg-white transition-colors ${
        isDragOver ? "bg-indigo-50 border-indigo-300" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-[13px] font-bold text-slate-700">インボックス</span>
        <span className="text-[11px] font-semibold text-white bg-slate-400 rounded-full px-1.5 py-0.5 leading-none">
          {sorted.length}
        </span>
        <span className="ml-auto text-[10px] text-slate-300">優先度 · 期限順</span>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {isDragOver && (
          <div className="border-2 border-dashed border-indigo-300 rounded-xl py-4 text-center text-[11px] text-indigo-400 font-semibold">
            ここにドロップしてインボックスへ戻す
          </div>
        )}
        {sorted.length === 0 && !isDragOver ? (
          <p className="text-center text-slate-400 text-[12px] py-8">
            未配置のタスクはありません
          </p>
        ) : (
          sorted.map((t) => <InboxChip key={t.id} task={t} onEdit={onEdit} />)
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-slate-100">
        <p className="text-[10px] text-slate-300 text-center">
          ドラッグしてタイムラインに配置 / インボックスに戻す
        </p>
      </div>
    </aside>
  );
}
