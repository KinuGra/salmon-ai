"use client";

import { useState, useEffect, useRef } from "react";
import { Task } from "./types";
import { MOCK_TASKS } from "./mock-data";
import {
  PX_PER_MIN,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  minsToLabel,
} from "./utils";
import TaskBlock from "./TaskBlock";
import InboxDrawer from "./InboxDrawer";
import InboxSidebar from "./InboxSidebar";

const HOURS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
  (_, i) => TIMELINE_START_HOUR + i
);

const MOTIVATION_QUOTES = [
  "思い浮かんだら即行動",
  "小さな一歩が大きな前進",
  "集中の時間が価値を生む",
  "今日の積み上げが未来になる",
];

function CurrentTimeLine() {
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes() - TIMELINE_START_HOUR * 60;
      if (mins < 0 || mins > (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60) {
        setTop(null);
      } else {
        setTop(mins * PX_PER_MIN);
      }
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, []);

  if (top === null) return null;

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        <div className="flex-1 h-px bg-red-400" />
      </div>
    </div>
  );
}

function AIModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-indigo-600 text-lg">✦</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-[15px]">
              AIスケジューリング診断
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">診断中...</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-[12px] text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-700 mb-1.5">診断結果</p>
          <p>
            本日のスケジュールは{" "}
            <span className="text-amber-600 font-bold">バッファ不足</span>{" "}
            の可能性があります。
          </p>
          <ul className="mt-2 space-y-1">
            <li className="flex gap-1.5">
              <span className="text-amber-500 shrink-0">▲</span>
              「認証APIの実装」はAI見積もりより1.5h多くかかる見込みです
            </li>
            <li className="flex gap-1.5">
              <span className="text-amber-500 shrink-0">▲</span>
              16:00以降に0.5hの空きを確保することを推奨します
            </li>
            <li className="flex gap-1.5">
              <span className="text-green-500 shrink-0">✓</span>
              午前中の集中ブロックは効果的に配置されています
            </li>
          </ul>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

export default function TimeBlockingPage() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [showAI, setShowAI] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const quoteIdx = useRef(Math.floor(Math.random() * MOTIVATION_QUOTES.length));

  const scheduled = tasks.filter((t) => t.start_time !== null);
  const inbox = tasks.filter((t) => t.start_time === null);

  const handleAchievementChange = (id: number, value: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, achievement_rate: value, is_completed: value === 100 }
          : t
      )
    );
  };

  const totalHeight = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60 * PX_PER_MIN;

  const today = new Date();
  const dateLabel = today.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    // スマホ: 1カラム縦積み / PC(lg+): ヘッダー固定 + コンテンツ2カラム
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header（全幅・常時表示） ── */}
      <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-30 border-b border-slate-100 px-4 pt-4 pb-3">
        {/* Row 1: date + quote */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] text-slate-400 font-medium leading-none mb-0.5">
              タイムブロッキング
            </p>
            <h1 className="text-[18px] font-bold text-slate-800 leading-tight">
              {dateLabel}
            </h1>
          </div>
          {/* Motivation bubble */}
          <div className="relative mt-1">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl rounded-tr-sm px-3 py-1.5 max-w-[160px]">
              <p className="text-[11px] font-semibold text-indigo-700 leading-snug text-right">
                {MOTIVATION_QUOTES[quoteIdx.current]}
              </p>
            </div>
            <div className="absolute -top-1 right-1 w-2 h-2 bg-indigo-50 border-t border-r border-indigo-100 rotate-45" />
          </div>
        </div>

        {/* Row 2: AI button + add button */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowAI(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[12px] font-bold shadow-sm hover:shadow-md active:scale-95 transition-all"
          >
            <span className="text-[14px] leading-none">✦</span>
            AIスケジューリング診断
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[20px] font-light flex items-center justify-center active:scale-95 transition-all"
            aria-label="タスク追加"
          >
            +
          </button>
        </div>
      </div>

      {/* ── コンテンツエリア: スマホ=縦積み / PC=2カラム ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* 左カラム: タイムライン（スマホ全幅 / PC flex-1） */}
        <div className="flex-1 overflow-y-auto pb-48 lg:pb-4 px-2 pt-2">
          <div
            ref={timelineRef}
            className="relative"
            style={{ height: totalHeight }}
          >
            {/* Hour grid lines + labels */}
            {HOURS.map((h) => {
              const y = (h - TIMELINE_START_HOUR) * 60 * PX_PER_MIN;
              return (
                <div
                  key={h}
                  className="absolute left-0 right-0 flex items-center pointer-events-none"
                  style={{ top: y }}
                >
                  <span className="text-[10px] text-slate-400 font-medium w-9 shrink-0 text-right pr-2 leading-none select-none">
                    {minsToLabel(h * 60)}
                  </span>
                  <div className="flex-1 border-t border-slate-200" />
                </div>
              );
            })}

            {/* Half-hour dashed lines */}
            {HOURS.slice(0, -1).map((h) => {
              const y = ((h - TIMELINE_START_HOUR) * 60 + 30) * PX_PER_MIN;
              return (
                <div
                  key={`${h}-half`}
                  className="absolute left-9 right-0 border-t border-slate-100 border-dashed pointer-events-none"
                  style={{ top: y }}
                />
              );
            })}

            {/* Task blocks */}
            <div className="absolute left-10 right-0 top-0 bottom-0">
              <CurrentTimeLine />
              {scheduled.map((task) => (
                <TaskBlock
                  key={task.id}
                  task={task}
                  onAchievementChange={handleAchievementChange}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 右カラム: PC専用インボックスサイドバー（スマホでは非表示） */}
        <InboxSidebar tasks={inbox} />

      </div>

      {/* ── モバイル専用インボックスDrawer（PCでは非表示） ── */}
      <InboxDrawer tasks={inbox} />

      {/* ── AI Modal ── */}
      {showAI && <AIModal onClose={() => setShowAI(false)} />}

      {/* ── Add Task Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-t-2xl w-full max-w-lg p-5 shadow-2xl">
            <h3 className="font-bold text-[15px] text-slate-800 mb-4">タスクを追加</h3>
            <input
              type="text"
              placeholder="タスク名を入力..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-[13px] font-semibold"
              >
                キャンセル
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-[13px] font-bold"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
