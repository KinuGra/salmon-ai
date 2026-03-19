"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Task } from "./types";

const API_BASE = "http://localhost:8080";
import {
  PX_PER_MIN,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  minsToLabel,
  topToIso,
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

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// ────────────────────────────────────────────
// ② 週ナビゲーション
// ────────────────────────────────────────────
function DateNav({
  selected,
  onChange,
}: {
  selected: Date;
  onChange: (d: Date) => void;
}) {
  // 選択日を中心に前後3日 = 合計7日
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selected);
    d.setDate(d.getDate() - 3 + i);
    return d;
  });

  const todayStr = new Date().toDateString();

  return (
    <div className="flex gap-1 mb-3">
      {days.map((day, i) => {
        const isSelected = day.toDateString() === selected.toDateString();
        const isToday = day.toDateString() === todayStr;
        const dow = day.getDay();
        const isSat = dow === 6;
        const isSun = dow === 0;

        return (
          <button
            key={i}
            onClick={() => onChange(new Date(day))}
            className={`flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all ${
              isSelected
                ? "bg-indigo-600 shadow-sm"
                : "hover:bg-slate-100 active:scale-95"
            }`}
          >
            {/* 曜日 */}
            <span
              className={`text-[9px] font-semibold mb-0.5 leading-none ${
                isSelected
                  ? "text-indigo-200"
                  : isSat
                  ? "text-blue-400"
                  : isSun
                  ? "text-red-400"
                  : "text-slate-400"
              }`}
            >
              {DAY_LABELS[dow]}
            </span>
            {/* 日付 */}
            <span
              className={`text-[14px] font-bold leading-none ${
                isSelected
                  ? "text-white"
                  : isToday
                  ? "text-indigo-600"
                  : "text-slate-800"
              }`}
            >
              {day.getDate()}
            </span>
            {/* 今日インジケーター */}
            {isToday && !isSelected && (
              <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────
// 現在時刻ライン
// ────────────────────────────────────────────
function CurrentTimeLine() {
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const mins =
        now.getHours() * 60 + now.getMinutes() - TIMELINE_START_HOUR * 60;
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

// ────────────────────────────────────────────
// AIスケジューリング診断モーダル
// ────────────────────────────────────────────
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

// ────────────────────────────────────────────
// メインページ
// ────────────────────────────────────────────
export default function TimeBlockingPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function showError(msg: string) {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  }

  useEffect(() => {
    fetch(`${API_BASE}/tasks`)
      .then((r) => r.json())
      .then((data: Task[]) => setTasks(data))
      .catch((e) => console.error("タスク取得エラー:", e));
  }, []);

  const [showAI, setShowAI] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // D&D中のドロップ位置インジケーター（top px）
  const [dropIndicator, setDropIndicator] = useState<number | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const quoteIdx = useRef(Math.floor(Math.random() * MOTIVATION_QUOTES.length));

  // ③ 選択日付でタイムラインのタスクをフィルタリング
  // 本番では selectedDate を queryKey に含めた TanStack Query に置き換える
  const selectedDateStr = selectedDate.toDateString();
  const scheduled = tasks.filter(
    (t) =>
      t.start_time !== null &&
      new Date(t.start_time).toDateString() === selectedDateStr
  );
  const inbox = tasks.filter((t) => t.start_time === null);


  function handleDateChange(d: Date) {
    setSelectedDate(d);
  }

  // 達成度変更
  async function handleAchievementChange(id: number, value: number) {
    const originalTasks = tasks;
    setTasks((prev: Task[]) =>
      prev.map((t: Task) =>
        t.id === id
          ? { ...t, achievement_rate: value, is_completed: value === 100 }
          : t
      )
    );
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievement_rate: value }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
    } catch (e) {
      console.error("達成度更新エラー:", e);
      setTasks(originalTasks);
      showError("達成度を更新できませんでした。");
    }
  }

  // ③ D&D: タイムライン上でドラッグオーバー中 → インジケーター更新
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const rawTop = e.clientY - rect.top;
    // 15分単位に丸めた top を表示
    const snappedTop = Math.round(rawTop / (15 * PX_PER_MIN)) * (15 * PX_PER_MIN);
    setDropIndicator(snappedTop);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropIndicator(null);
  }, []);

  /** start_time (ISO文字列) からデフォルト30分後の end_time を返すヘルパー */
  function calculateDefaultEndTime(startTime: string): string {
    const end = new Date(startTime);
    end.setMinutes(end.getMinutes() + 30);
    return end.toISOString().slice(0, 19) + "Z";
  }

  // ③ D&D: ドロップ → start_time / end_time を計算してオプティミスティック更新
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDropIndicator(null);

      const taskId = Number(e.dataTransfer.getData("taskId"));
      if (!taskId || !timelineRef.current) return;

      const dragType = e.dataTransfer.getData("dragType"); // "scheduled" | ""
      const rect = timelineRef.current.getBoundingClientRect();
      const rawTop = e.clientY - rect.top;

      let start: string;
      let end: string;

      if (dragType === "scheduled") {
        // タイムライン上のブロックを移動: grabOffset を考慮してブロック上端を計算
        const grabOffset = Number(e.dataTransfer.getData("grabOffset") || "0");
        const adjustedTop = rawTop - grabOffset;
        start = topToIso(adjustedTop, selectedDate);

        // 元のタスクの長さ（ミリ秒）を保持
        const existing = tasks.find((t) => t.id === taskId);
        if (existing && existing.start_time && existing.end_time) {
          const durationMs =
            new Date(existing.end_time).getTime() -
            new Date(existing.start_time).getTime();
          end = new Date(new Date(start).getTime() + durationMs).toISOString().slice(0, 19) + "Z";
        } else {
          // フォールバック: 30分
          end = calculateDefaultEndTime(start);
        }
      } else {
        // インボックスからのドロップ: estimated_hours を使って end_time を計算、なければ30分
        start = topToIso(rawTop, selectedDate);
        const droppedTask = tasks.find((t: Task) => t.id === taskId);
        if (droppedTask?.estimated_hours) {
          const endDate = new Date(start);
          endDate.setMinutes(endDate.getMinutes() + droppedTask.estimated_hours * 60);
          end = endDate.toISOString().slice(0, 19) + "Z";
        } else {
          end = calculateDefaultEndTime(start);
        }
      }

      // オプティミスティック更新: 即座にUIへ反映
      const originalTasks = tasks;
      setTasks((prev: Task[]) =>
        prev.map((t: Task) =>
          t.id === taskId ? { ...t, start_time: start, end_time: end } : t
        )
      );

      fetch(`${API_BASE}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_time: start, end_time: end }),
      }).then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
      }).catch((e) => {
        console.error("タイムブロック更新エラー:", e);
        setTasks(originalTasks);
        showError("タスクを移動できませんでした。");
      });
    },
    [selectedDate, tasks]
  );

  // インボックスへ戻す（start_time / end_time を null にする）
  async function handleReturnToInbox(taskId: number) {
    const originalTasks = tasks;
    setTasks((prev: Task[]) =>
      prev.map((t: Task) =>
        t.id === taskId ? { ...t, start_time: null, end_time: null } : t
      )
    );
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear_start_time: true, clear_end_time: true }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
    } catch (e) {
      console.error("インボックス戻しエラー:", e);
      setTasks(originalTasks);
      showError("タスクをインボックスに戻せませんでした。");
    }
  }

  const totalHeight =
    (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60 * PX_PER_MIN;

  const dateLabel = selectedDate.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-[12px] font-semibold px-4 py-2 rounded-xl shadow-lg pointer-events-none">
          {errorMessage}
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-slate-100 px-4 pt-3 pb-3">

        {/* Row 1: ② 週ナビゲーション */}
        <DateNav selected={selectedDate} onChange={handleDateChange} />

        {/* Row 2: 日付ラベル + モチベーション吹き出し */}
        <div className="flex items-start justify-between mb-2.5">
          <div>
            <p className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">
              タイムブロッキング
            </p>
            <h1 className="text-[17px] font-bold text-slate-900 leading-tight">
              {dateLabel}
            </h1>
          </div>
          <div className="relative mt-0.5">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl rounded-tr-sm px-3 py-1.5 max-w-[160px]">
              <p className="text-[11px] font-semibold text-indigo-700 leading-snug text-right">
                {MOTIVATION_QUOTES[quoteIdx.current]}
              </p>
            </div>
            <div className="absolute -top-1 right-1 w-2 h-2 bg-indigo-50 border-t border-r border-indigo-100 rotate-45" />
          </div>
        </div>

        {/* Row 3: AIボタンのみ（① +ボタン削除） */}
        <button
          onClick={() => setShowAI(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[12px] font-bold shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
        >
          <span className="text-[14px] leading-none">✦</span>
          AIスケジューリング診断
        </button>
      </div>

      {/* ── コンテンツエリア: スマホ=縦積み / PC=2カラム ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* 左カラム: タイムライン */}
        <div className="flex-1 overflow-y-auto pb-48 lg:pb-4 px-2 pt-2">
          {/* ③ タイムライン全体をD&Dドロップゾーンに */}
          <div
            ref={timelineRef}
            className="relative"
            style={{ height: totalHeight }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* 時間グリッド（正時） */}
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

            {/* 30分グリッド（破線） */}
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

            {/* ③ D&D ドロップ位置インジケーター */}
            {dropIndicator !== null && (
              <div
                className="absolute left-9 right-0 z-30 pointer-events-none"
                style={{ top: dropIndicator }}
              >
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <div className="flex-1 h-0.5 bg-indigo-400 rounded-full" />
                </div>
              </div>
            )}

            {/* タスクブロック */}
            <div className="absolute left-10 right-0 top-0 bottom-0">
              <CurrentTimeLine />
              {scheduled.map((task: Task) => (
                <TaskBlock
                  key={task.id}
                  task={task}
                  onAchievementChange={handleAchievementChange}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 右カラム: PC専用インボックス（スマホでは非表示） */}
        <InboxSidebar tasks={inbox} onReturnToInbox={handleReturnToInbox} />
      </div>

      {/* モバイル専用インボックスDrawer（PCでは非表示） */}
      <InboxDrawer tasks={inbox} onReturnToInbox={handleReturnToInbox} />

      {/* AIモーダル */}
      {showAI && <AIModal onClose={() => setShowAI(false)} />}
    </div>
  );
}
