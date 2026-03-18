"use client";

import { useState } from "react";
import { Task } from "./types";
import { InboxChip, sortInbox } from "./inbox-shared";

type Props = { tasks: Task[] };

export default function InboxDrawer({ tasks }: Props) {
  const [expanded, setExpanded] = useState(false);
  const sorted = sortInbox(tasks);

  return (
    // lg+ では InboxSidebar が代わりに表示されるため、このDrawerは非表示
    <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
      <div
        className="bg-white/95 backdrop-blur-sm border-t border-slate-200 rounded-t-2xl"
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

        {/* Peek row */}
        {!expanded && sorted.length > 0 && (
          <div className="px-4 pb-4 flex gap-2 overflow-x-auto">
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
