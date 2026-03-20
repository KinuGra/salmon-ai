"use client";

import { useState, useEffect } from "react";
import { MobileTab, LeftTab, Report, Reflection } from "./types";
import ReportView from "./ReportView";
import ChatView from "./ChatView";
import HistoryView from "./HistoryView";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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
  { key: "report",  label: "レポート" },
  { key: "chat",    label: "振り返り" },
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
  const [leftTab, setLeftTab]     = useState<LeftTab>("report");

  const [report, setReport]                   = useState<Report | null>(null);
  const [todayReflection, setTodayReflection] = useState<Reflection | null>(null);
  const [reflections, setReflections]         = useState<Reflection[]>([]);

  useEffect(() => {
    fetchReport();
    fetchTodayReflection();
    fetchReflections();
  }, []);

  async function fetchReport() {
    try {
      const res = await fetch(`${API_BASE}/reports/latest`);
      if (res.ok) setReport(await res.json());
    } catch {
      // レポート未生成時は null のまま
    }
  }

  async function fetchTodayReflection() {
    try {
      const res = await fetch(`${API_BASE}/reflections/today`);
      if (res.ok) setTodayReflection(await res.json());
    } catch {
      // エラー時は null のまま
    }
  }

  async function fetchReflections() {
    try {
      const res = await fetch(`${API_BASE}/reflections`);
      if (res.ok) setReflections(await res.json());
    } catch {
      setReflections([]);
    }
  }

  const reportPanel = (
    <ReportView
      report={report}
      onReportGenerated={(r) => setReport(r)}
    />
  );

  const historyPanel = <HistoryView reflections={reflections} />;

  const chatPanel = (
    <ChatView reflectionId={todayReflection?.id ?? null} />
  );

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
        <MobileTabBar active={mobileTab} onChange={setMobileTab} />
      </header>

      {/* ── コンテンツエリア ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* デスクトップ左パネル */}
        <div className="hidden lg:flex flex-col w-[52%] border-r border-slate-100 overflow-hidden">
          <LeftTabBar active={leftTab} onChange={setLeftTab} />
          <div className="flex-1 overflow-hidden flex flex-col">
            {leftTab === "report" ? reportPanel : historyPanel}
          </div>
        </div>

        {/* チャットパネル */}
        <div className={`flex-1 flex-col overflow-hidden ${mobileTab === "chat" ? "flex" : "hidden lg:flex"}`}>
          {chatPanel}
        </div>

        {/* モバイル: レポートタブ */}
        <div className={`flex-1 overflow-hidden flex-col ${mobileTab === "report" ? "flex lg:hidden" : "hidden"}`}>
          {reportPanel}
        </div>

        {/* モバイル: 履歴タブ */}
        <div className={`flex-1 overflow-hidden flex-col ${mobileTab === "history" ? "flex lg:hidden" : "hidden"}`}>
          {historyPanel}
        </div>
      </div>
    </div>
  );
}
