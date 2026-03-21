"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Task, ScheduleResponse } from "./types";
import EditTaskModal, { Category } from "../task-list/EditTaskModal";
import { DragProvider, useDragContext } from "./DragContext";

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

export default function TimeBlockingPage() {
  return (
    <DragProvider>
      <TimeBlockingContent />
    </DragProvider>
  );
}

const HOURS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
  (_, i) => TIMELINE_START_HOUR + i,
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
            className={`flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all ${isSelected
              ? "bg-indigo-600 shadow-sm"
              : "hover:bg-slate-100 active:scale-95"
              }`}
          >
            {/* 曜日 */}
            <span
              className={`text-[9px] font-semibold mb-0.5 leading-none ${isSelected
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
              className={`text-[14px] font-bold leading-none ${isSelected
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
function AIModal({
  selectedDate,
  onClose,
}: {
  selectedDate: Date;
  onClose: () => void;
}) {
  const [result, setResult] = useState<ScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const date = selectedDate.toISOString().split("T")[0];
    fetch(`${API_BASE}/ai/schedule/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((data: ScheduleResponse) => setResult(data))
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError("診断に失敗しました。");
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [selectedDate]);

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
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isLoading ? "診断中..." : "診断完了"}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 text-[12px] text-slate-600 leading-relaxed">
          {/* ローディング */}
          {isLoading && (
            <p className="text-center text-slate-400 py-4">診断しています...</p>
          )}

          {/* エラー */}
          {error && (
            <p className="text-center text-red-500 py-4">{error}</p>
          )}

          {/* 結果 */}
          {result && (
            <>
              <p className="font-semibold text-slate-700 mb-2">診断結果</p>

              {/* 問題なし */}
              {!result.issues.buffer_shortage && !result.issues.priority_bias && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-green-500">✓</span>
                  <span>問題は検出されませんでした</span>
                </div>
              )}

              {/* バッファ不足 */}
              {result.issues.buffer_shortage && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-amber-500 shrink-0">▲</span>
                  <span className="text-amber-600 font-bold">バッファ不足</span>
                </div>
              )}

              {/* 優先度の偏り */}
              {result.issues.priority_bias && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-amber-500 shrink-0">▲</span>
                  <span className="text-amber-600 font-bold">優先度の偏りあり</span>
                </div>
              )}

              {/* アドバイス */}
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="font-semibold text-slate-700 mb-1">アドバイス</p>
                <p className="text-slate-600 leading-relaxed">{result.advice}</p>
              </div>
            </>
          )}
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
// メインコンテンツ（DragProvider の内側で動作）
// ────────────────────────────────────────────
function TimeBlockingContent() {
  const { dragInfoRef, lastDropXRef } = useDragContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function showError(msg: string) {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  }

  const [showAI, setShowAI] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/categories`)
      .then((r) => r.json())
      .then((data: Category[]) => setCategories(data))
      .catch((e) => console.error("カテゴリ取得エラー:", e));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    fetch(`${API_BASE}/tasks`)
      .then((r) => r.json())
      .then((data: Task[]) => setTasks(data))
      .catch((e) => console.error("タスク取得エラー:", e));
  }, [selectedDate]);

  async function handleUpdateTask(updated: Task, categoryId: number | null) {
    try {
      // タイムブロック済み & estimated_hours が変わった場合は end_time を再計算して PUT に含める
      let newEndTime: string | undefined = undefined;
      const original = tasks.find((t) => t.id === updated.id);
      if (
        updated.start_time &&
        updated.estimated_hours != null &&
        original?.estimated_hours !== updated.estimated_hours
      ) {
        const startMs = new Date(updated.start_time).getTime();
        const endDate = new Date(startMs + updated.estimated_hours * 3600 * 1000);
        newEndTime = endDate.toISOString().slice(0, 19) + "Z";
      }

      const body: Record<string, unknown> = {
        title: updated.title,
        description: updated.description,
        priority: updated.priority,
        estimated_hours: updated.estimated_hours,
        due_date: updated.due_date,
        category_id: categoryId,
      };
      if (newEndTime !== undefined) {
        body.end_time = newEndTime;
      }

      const res = await fetch(`${API_BASE}/tasks/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const saved: Task = await res.json();
      // オプティミスティック更新: end_time も反映する
      setTasks((prev: Task[]) =>
        prev.map((t) =>
          t.id === saved.id
            ? { ...saved, end_time: newEndTime ?? saved.end_time }
            : t
        )
      );
    } catch (e) {
      console.error("タスク更新エラー:", e);
      showError("タスクを更新できませんでした。");
    }
  }

  async function handleDeleteTask(id: number) {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setTasks((prev: Task[]) => prev.filter((t) => t.id !== id));
      setEditingTask(null);
    } catch (e) {
      console.error("タスク削除エラー:", e);
      showError("タスクを削除できませんでした。");
    }
  }
  // D&D中のドロップ位置インジケーター（top/bottom px）
  const [dropIndicator, setDropIndicator] = useState<{
    top: number;
    bottom: number;
  } | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  // SSR時のHydrationエラーを防ぐため、初期状態は固定値またはnullにし、クライアントサイドでランダムな値を設定する
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    setQuoteIdx(Math.floor(Math.random() * MOTIVATION_QUOTES.length));
  }, []);

  // ③ 選択日付でタイムラインのタスクをフィルタリング
  // 本番では selectedDate を queryKey に含めた TanStack Query に置き換える
  const selectedDateStr = selectedDate?.toDateString() ?? "";
  const scheduled = tasks.filter(
    (t) =>
      t.start_time !== null &&
      new Date(t.start_time).toDateString() === selectedDateStr,
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
          ? {
            ...t,
            achievement_rate: value,
            ...(value === 100 ? { is_completed: true } : {}),
          }
          : t,
      ),
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

  // タッチドロップ（スマホ対応）: clientY からタイムライン上の時刻を計算してタスクを配置
  const handleTouchDrop = useCallback(
    (taskId: number, clientY: number, dragType: "scheduled" | "inbox") => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();

      // インボックスゾーン上にドロップされたか判定（elementsFromPoint でz-indexに依存しない判定）
      if (dragType === "scheduled") {
        const clientX = lastDropXRef.current || window.innerWidth / 2;
        const isOverInbox = document.elementsFromPoint(clientX, clientY)
          .some((el) => (el as HTMLElement).dataset?.inboxDropZone === "true");
        if (isOverInbox) {
          const originalTasks = tasks;
          setTasks((prev: Task[]) =>
            prev.map((t: Task) => t.id === taskId ? { ...t, start_time: null, end_time: null } : t)
          );
          fetch(`${API_BASE}/tasks/${taskId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clear_start_time: true, clear_end_time: true }),
          }).then((res) => {
            if (!res.ok) throw new Error(`status ${res.status}`);
          }).catch((e) => {
            console.error("インボックス戻しエラー:", e);
            setTasks(originalTasks);
            showError("タスクをインボックスに戻せませんでした。");
          });
          return;
        }
      }

      if (clientY < rect.top || clientY > rect.bottom) return;

      const rawTop = clientY - rect.top;
      const dragInfo = dragInfoRef.current;

      let start: string;
      let end: string;

      if (dragType === "scheduled") {
        const adjustedTop = rawTop - dragInfo.grabOffset;
        start = topToIso(adjustedTop, selectedDate!);
        const existing = tasks.find((t) => t.id === taskId);
        if (existing?.start_time && existing?.end_time) {
          const durationMs = new Date(existing.end_time).getTime() - new Date(existing.start_time).getTime();
          end = new Date(new Date(start).getTime() + durationMs).toISOString().slice(0, 19) + "Z";
        } else {
          end = calculateDefaultEndTime(start);
        }
      } else {
        start = topToIso(rawTop, selectedDate!);
        const droppedTask = tasks.find((t) => t.id === taskId);
        if (droppedTask?.estimated_hours) {
          const endDate = new Date(start);
          endDate.setMinutes(endDate.getMinutes() + droppedTask.estimated_hours * 60);
          end = endDate.toISOString().slice(0, 19) + "Z";
        } else {
          end = calculateDefaultEndTime(start);
        }
      }

      const originalTasks = tasks;
      setTasks((prev: Task[]) =>
        prev.map((t: Task) => t.id === taskId ? { ...t, start_time: start, end_time: end } : t)
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

  // ③ D&D: タイムライン上でドラッグオーバー中 → インジケーター更新
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const rawTop = e.clientY - rect.top;
    const dragInfo = dragInfoRef.current;
    // grabOffset を考慮してブロック上端の位置を計算し、15分単位に丸める
    const adjustedTop = rawTop - dragInfo.grabOffset;
    const snappedTop =
      Math.round(adjustedTop / (15 * PX_PER_MIN)) * (15 * PX_PER_MIN);
    const snappedBottom = snappedTop + dragInfo.durationMins * PX_PER_MIN;
    setDropIndicator({ top: snappedTop, bottom: snappedBottom });
  }, [dragInfoRef]);

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
        start = topToIso(adjustedTop, selectedDate!);

        // 元のタスクの長さ（ミリ秒）を保持
        const existing = tasks.find((t) => t.id === taskId);
        if (existing && existing.start_time && existing.end_time) {
          const durationMs =
            new Date(existing.end_time).getTime() -
            new Date(existing.start_time).getTime();
          end =
            new Date(new Date(start).getTime() + durationMs)
              .toISOString()
              .slice(0, 19) + "Z";
        } else {
          // フォールバック: 30分
          end = calculateDefaultEndTime(start);
        }
      } else {
        // インボックスからのドロップ: estimated_hours を使って end_time を計算、なければ30分
        start = topToIso(rawTop, selectedDate!);
        const droppedTask = tasks.find((t: Task) => t.id === taskId);
        if (droppedTask?.estimated_hours) {
          const endDate = new Date(start);
          endDate.setMinutes(
            endDate.getMinutes() + droppedTask.estimated_hours * 60,
          );
          end = endDate.toISOString().slice(0, 19) + "Z";
        } else {
          end = calculateDefaultEndTime(start);
        }
      }

      // オプティミスティック更新: 即座にUIへ反映
      const originalTasks = tasks;
      setTasks((prev: Task[]) =>
        prev.map((t: Task) =>
          t.id === taskId ? { ...t, start_time: start, end_time: end } : t,
        ),
      );

      fetch(`${API_BASE}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_time: start, end_time: end }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`status ${res.status}`);
        })
        .catch((e) => {
          console.error("タイムブロック更新エラー:", e);
          setTasks(originalTasks);
          showError("タスクを移動できませんでした。");
        });
    },
    [selectedDate, tasks],
  );

  if (!selectedDate) return null;

  // インボックスへ戻す（start_time / end_time を null にする）
  async function handleReturnToInbox(taskId: number) {
    const originalTasks = tasks;
    setTasks((prev: Task[]) =>
      prev.map((t: Task) =>
        t.id === taskId ? { ...t, start_time: null, end_time: null } : t,
      ),
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
    <div
      className="bg-slate-50 flex flex-col"
      style={{ height: "calc(100svh - var(--bottom-nav-height))" }}
    >
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
                {MOTIVATION_QUOTES[quoteIdx]}
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

            {/* ③ D&D ドロップ位置インジケーター（上端・下端ライン + 半透明エリア） */}
            {dropIndicator !== null && (
              <>
                {/* 半透明エリア */}
                <div
                  className="absolute left-9 right-0 z-29 pointer-events-none bg-indigo-200/40 rounded-lg"
                  style={{
                    top: dropIndicator.top,
                    height: dropIndicator.bottom - dropIndicator.top,
                  }}
                />
                {/* 上端ライン */}
                <div
                  className="absolute left-9 right-0 z-30 pointer-events-none"
                  style={{ top: dropIndicator.top }}
                >
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <div className="flex-1 h-0.5 bg-indigo-500 rounded-full" />
                  </div>
                </div>
                {/* 下端ライン */}
                <div
                  className="absolute left-9 right-0 z-30 pointer-events-none"
                  style={{ top: dropIndicator.bottom }}
                >
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <div className="flex-1 h-0.5 bg-indigo-500 rounded-full" />
                  </div>
                </div>
              </>
            )}

            {/* タスクブロック */}
            <div className="absolute left-10 right-0 top-0 bottom-0">
              <CurrentTimeLine />
              {scheduled.map((task: Task) => (
                <TaskBlock
                  key={task.id}
                  task={task}
                  onAchievementChange={handleAchievementChange}
                  onEdit={setEditingTask}
                  onTouchDrop={handleTouchDrop}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 右カラム: PC専用インボックス（スマホでは非表示） */}
        <InboxSidebar tasks={inbox} onReturnToInbox={handleReturnToInbox} onEdit={setEditingTask} onTouchDrop={handleTouchDrop} />
      </div>

      {/* モバイル専用インボックスDrawer（PCでは非表示） */}
      <InboxDrawer tasks={inbox} onReturnToInbox={handleReturnToInbox} onEdit={setEditingTask} onTouchDrop={handleTouchDrop} />

      {/* AIモーダル */}
      {showAI && (
        <AIModal
          selectedDate={selectedDate}
          onClose={() => setShowAI(false)}
        />
      )}

      {/* タスク編集モーダル */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          categories={categories}
        />
      )}
    </div>
  );
}
