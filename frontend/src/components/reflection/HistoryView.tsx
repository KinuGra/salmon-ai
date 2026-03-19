"use client";

import { useState } from "react";
import { Reflection, ReflectionMessage } from "./types";

// ────────────────────────────────────────────
// 日付フォーマット
// ────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function daysAgoLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "今日";
  if (diff === 1) return "昨日";
  return `${diff}日前`;
}

// ────────────────────────────────────────────
// 過去メッセージ一覧（展開パネル内）
// ────────────────────────────────────────────
function MessageLog({ messages }: { messages: ReflectionMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="text-[12px] text-slate-400 text-center py-4">
        メッセージはありません
      </p>
    );
  }

  return (
    <div className="space-y-2.5 py-3 px-3">
      {messages.map((msg) => {
        const isUser = msg.role === "user";
        return (
          <div
            key={msg.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            {!isUser && (
              <div className="max-w-[82%]">
                <p className="text-[9px] text-slate-400 font-semibold mb-1 ml-1">
                  ✦ AI
                </p>
                <div className="bg-white border border-slate-200 rounded-xl rounded-tl-sm px-3 py-2">
                  <p className="text-[12px] text-slate-700 leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            )}
            {isUser && (
              <div className="max-w-[82%] bg-indigo-600 rounded-xl rounded-tr-sm px-3 py-2">
                <p className="text-[12px] text-white leading-relaxed">
                  {msg.content}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────
// 振り返り1件分の行
// ────────────────────────────────────────────
function HistoryItem({
  reflection,
  messages,
  isExpanded,
  onToggle,
}: {
  reflection: Reflection;
  messages: ReflectionMessage[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const msgCount = messages.length;
  const hasMessages = msgCount > 0;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {/* 日付バッジ */}
          <div
            className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 transition-colors ${
              isExpanded
                ? "bg-indigo-600"
                : "bg-slate-100"
            }`}
          >
            <span
              className={`text-[14px] font-bold leading-none ${
                isExpanded ? "text-white" : "text-slate-700"
              }`}
            >
              {new Date(reflection.date + "T00:00:00").getDate()}
            </span>
            <span
              className={`text-[9px] font-semibold leading-none mt-0.5 ${
                isExpanded ? "text-indigo-200" : "text-slate-400"
              }`}
            >
              {new Date(reflection.date + "T00:00:00").toLocaleDateString(
                "ja-JP",
                { month: "numeric" }
              )}月
            </span>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-slate-900">
              {formatDate(reflection.date)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {daysAgoLabel(reflection.date)}
              {hasMessages && (
                <span className="ml-2">
                  · {msgCount}件のやり取り
                </span>
              )}
              {!hasMessages && <span className="ml-2">· 記録なし</span>}
            </p>
          </div>
        </div>

        <span
          className={`text-[11px] text-slate-400 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {/* 展開コンテンツ */}
      {isExpanded && (
        <div className="bg-slate-50 border-t border-slate-100">
          {hasMessages ? (
            <MessageLog messages={messages} />
          ) : (
            <div className="px-4 py-4 text-center">
              <p className="text-[12px] text-slate-400">
                この日の対話記録はありません
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// メインHistoryView
// ────────────────────────────────────────────
export default function HistoryView({
  reflections,
  messages,
}: {
  reflections: Reflection[];
  messages: Record<number, ReflectionMessage[]>;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(
    reflections[0]?.id ?? null
  );

  function toggle(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-100">
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest leading-none mb-0.5">
          History
        </p>
        <h2 className="text-[18px] font-bold text-slate-900 leading-tight">
          過去の振り返り
        </h2>
        <p className="text-[11px] text-slate-400 mt-1">
          {reflections.length}件の記録
        </p>
      </div>

      {/* リスト */}
      <div className="flex-1 overflow-y-auto">
        {reflections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-[14px] text-slate-400 font-medium">
              振り返り記録がありません
            </p>
            <p className="text-[11px] text-slate-400">
              振り返りタブからAIと対話を始めましょう
            </p>
          </div>
        ) : (
          <div className="divide-y-0">
            {reflections.map((r) => (
              <HistoryItem
                key={r.id}
                reflection={r}
                messages={messages[r.id] ?? []}
                isExpanded={expandedId === r.id}
                onToggle={() => toggle(r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
