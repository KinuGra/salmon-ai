"use client";

import { useState } from "react";
import { MobileTab, LeftTab } from "./types";
import { MOCK_REPORT, MOCK_REFLECTIONS, MOCK_HISTORY_MESSAGES } from "./mock-data";
import ReportView from "./ReportView";
import ChatView from "./ChatView";
import HistoryView from "./HistoryView";

// ────────────────────────────────────────────
// 今日の日付表示
// ────────────────────────────────────────────
function todayLabel(): string {
  return new Date().toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

// ────────────────────────────────────────────
// モバイルタブバー
// ────────────────────────────────────────────
const MOBILE_TABS: { key: MobileTab; label: string }[] = [
  { key: "report", label: "レポート" },
  { key: "chat",   label: "振り返り" },
  { key: "history", label: "履歴" },
];

function MobileTabBar({
  active,
  onChange,
}: {
  active: MobileTab;
  onChange: (t: MobileTab) => void;
}) {
  return (
    <nav className="flex border-b border-slate-200 lg:hidden flex-shrink-0">
      {MOBILE_TABS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 py-3 text-[12px] font-semibold transition-colors border-b-2 ${
            active === key
              ? "text-indigo-600 border-indigo-600"
              : "text-slate-400 border-transparent hover:text-slate-600"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

// ────────────────────────────────────────────
// デスクトップ左パネルのタブ
// ────────────────────────────────────────────
const LEFT_TABS: { key: LeftTab; label: string }[] = [
  { key: "report",  label: "自己分析レポート" },
  { key: "history", label: "過去の振り返り" },
];

function LeftTabBar({
  active,
  onChange,
}: {
  active: LeftTab;
  onChange: (t: LeftTab) => void;
}) {
  return (
    <div className="flex border-b border-slate-200 flex-shrink-0 px-1">
      {LEFT_TABS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-3 text-[12px] font-semibold transition-colors border-b-2 ${
            active === key
              ? "text-indigo-600 border-indigo-600"
              : "text-slate-400 border-transparent hover:text-slate-600"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────
// メインページ
// ────────────────────────────────────────────
export default function ReflectionPage() {
  const [mobileTab, setMobileTab] = useState<MobileTab>("report");
  const [leftTab, setLeftTab] = useState<LeftTab>("report");

  return (
    <div className="flex flex-col h-svh bg-white overflow-hidden">

      {/* ── ヘッダー ── */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-100 flex-shrink-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest leading-none mb-0.5">
              Reflection
            </p>
            <h1 className="text-[17px] font-bold text-slate-900 leading-tight">
              振り返り・自己分析
            </h1>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {todayLabel()}
          </span>
        </div>

        {/* モバイルタブバー */}
        <MobileTabBar active={mobileTab} onChange={setMobileTab} />
      </header>

      {/* ── コンテンツエリア ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── デスクトップ左パネル（lg以上で表示） ── */}
        <div className="hidden lg:flex flex-col w-[52%] border-r border-slate-100 overflow-hidden">
          <LeftTabBar active={leftTab} onChange={setLeftTab} />
          <div className="flex-1 overflow-hidden flex flex-col">
            {leftTab === "report" ? (
              <ReportView report={MOCK_REPORT} />
            ) : (
              <HistoryView
                reflections={MOCK_REFLECTIONS}
                messages={MOCK_HISTORY_MESSAGES}
              />
            )}
          </div>
        </div>

        {/* ── チャットパネル ── */}
        {/* モバイル: chat タブのときだけ表示 / デスクトップ: 常に右カラムで表示 */}
        <div
          className={`flex-1 flex-col overflow-hidden ${
            mobileTab === "chat" ? "flex" : "hidden lg:flex"
          }`}
        >
          <ChatView />
        </div>

        {/* ── モバイル: レポートタブ ── */}
        <div
          className={`flex-1 overflow-hidden flex-col ${
            mobileTab === "report" ? "flex lg:hidden" : "hidden"
          }`}
        >
          <ReportView report={MOCK_REPORT} />
        </div>

        {/* ── モバイル: 履歴タブ ── */}
        <div
          className={`flex-1 overflow-hidden flex-col ${
            mobileTab === "history" ? "flex lg:hidden" : "hidden"
          }`}
        >
          <HistoryView
            reflections={MOCK_REFLECTIONS}
            messages={MOCK_HISTORY_MESSAGES}
          />
        </div>
      </div>
    </div>
  );
}
