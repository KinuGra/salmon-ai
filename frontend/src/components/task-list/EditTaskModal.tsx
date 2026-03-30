"use client";

import { useEffect, useState } from "react";
import { Task } from "./types";

export type Category = { id: number; name: string; color: string };

const DURATION_QUICK: { label: string; mins: number }[] = [
  { label: "15m", mins: 15 },
  { label: "30m", mins: 30 },
  { label: "45m", mins: 45 },
  { label: "1h", mins: 60 },
  { label: "1.5h", mins: 90 },
  { label: "2h", mins: 120 },
  { label: "3h", mins: 180 },
  { label: "4h", mins: 240 },
];

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function makeDueDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function fmtMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoToLocalDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const offsetMs = d.getTimezoneOffset() * 60 * 1000;
  const local = new Date(d.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

function localDateTimeInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19) + "Z";
}

// ────────────────────────────────────────────
// 共通: 見積もり時間入力
// ────────────────────────────────────────────
export function DurationInput({
  initialMins,
  onChange,
}: {
  initialMins: number | null;
  onChange: (mins: number | null) => void;
}) {
  const [selectedMins, setSelectedMins] = useState<number | null>(initialMins);
  const [customH, setCustomH] = useState<string>("");
  const [customM, setCustomM] = useState<string>("0");

  useEffect(() => {
    const isQuick = DURATION_QUICK.some((d) => d.mins === initialMins);
    if (isQuick || initialMins === null) {
      setSelectedMins(initialMins);
      setCustomH("");
      setCustomM("0");
    } else {
      setSelectedMins(null);
      const h = Math.floor(initialMins / 60);
      const m = initialMins % 60;
      setCustomH(String(h));
      setCustomM(String(m));
    }
  }, [initialMins]);

  const customDurationMins =
    customH !== "" || customM !== "0"
      ? parseInt(customH || "0") * 60 + parseInt(customM)
      : null;
  const durationMins = selectedMins ?? customDurationMins;

  function handleQuickDuration(mins: number) {
    setSelectedMins(mins);
    setCustomH("");
    setCustomM("0");
    onChange(mins);
  }
  function handleCustomDuration(h: string, m: string) {
    setCustomH(h);
    setCustomM(m);
    setSelectedMins(null);
    const mins =
      h !== "" || m !== "0" ? parseInt(h || "0") * 60 + parseInt(m) : null;
    onChange(mins);
  }
  function handleClear() {
    setSelectedMins(null);
    setCustomH("");
    setCustomM("0");
    onChange(null);
  }

  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">
        見積もり時間
      </label>
      {durationMins !== null && (
        <div className="flex items-baseline justify-center gap-1 bg-indigo-50 rounded-xl py-2 mb-2">
          <span className="text-[28px] font-bold text-indigo-600 leading-none tabular-nums">
            {fmtMins(durationMins)}
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {DURATION_QUICK.map(({ label, mins }) => (
          <button
            key={mins}
            type="button"
            onClick={() => handleQuickDuration(mins)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
              selectedMins === mins
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            {label}
          </button>
        ))}
        {durationMins !== null && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-red-300 hover:text-red-500 transition-all active:scale-95"
          >
            クリア
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="23"
          value={customH}
          onChange={(e) => handleCustomDuration(e.target.value, customM)}
          placeholder="0"
          className="w-16 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
        />
        <span className="text-[13px] text-slate-500 font-medium shrink-0">
          h
        </span>
        <select
          value={customM}
          onChange={(e) => handleCustomDuration(customH, e.target.value)}
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
        >
          <option value="0">00</option>
          <option value="15">15</option>
          <option value="30">30</option>
          <option value="45">45</option>
        </select>
        <span className="text-[13px] text-slate-500 font-medium shrink-0">
          m
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// 共通: 期限入力
// ────────────────────────────────────────────
export function DueDateInput({
  initialDate,
  onChange,
}: {
  initialDate: Date | null;
  onChange: (date: Date | null) => void;
}) {
  const today = new Date();
  const THIS_YEAR = today.getFullYear();
  const DUE_QUICK = [
    { label: "今日", date: today },
    { label: "明日", date: addDays(today, 1) },
    { label: "3日後", date: addDays(today, 3) },
    { label: "来週", date: addDays(today, 7) },
  ];

  const [dueDate, setDueDate] = useState<Date | null>(initialDate);
  const [customYear, setCustomYear] = useState<string>(
    String(initialDate?.getFullYear() ?? THIS_YEAR),
  );
  const [customMonth, setCustomMonth] = useState<string>(
    initialDate ? String(initialDate.getMonth() + 1) : "",
  );
  const [customDay, setCustomDay] = useState<string>(
    initialDate ? String(initialDate.getDate()) : "",
  );

  function handleQuickDue(d: Date) {
    setDueDate(d);
    setCustomYear(String(d.getFullYear()));
    setCustomMonth(String(d.getMonth() + 1));
    setCustomDay(String(d.getDate()));
    onChange(d);
  }
  function handleCustomDue(year: string, month: string, day: string) {
    setCustomYear(year);
    setCustomMonth(month);
    setCustomDay(day);
    const y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);
    const candidate = new Date(y, m - 1, d);
    if (
      !isNaN(candidate.getTime()) &&
      candidate.getFullYear() === y &&
      candidate.getMonth() === m - 1 &&
      candidate.getDate() === d
    ) {
      setDueDate(candidate);
      onChange(candidate);
    } else {
      setDueDate(null);
      onChange(null);
    }
  }
  function clearDue() {
    setDueDate(null);
    setCustomYear(String(THIS_YEAR));
    setCustomMonth("");
    setCustomDay("");
    onChange(null);
  }

  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">
        期限（任意）
      </label>
      {dueDate && (
        <div className="flex items-baseline justify-center gap-1.5 bg-indigo-50 rounded-xl py-2 mb-2">
          <span className="text-[28px] font-bold text-indigo-600 leading-none tabular-nums">
            {fmtMD(dueDate)}
          </span>
          <span className="text-[13px] text-indigo-400 font-semibold leading-none pb-0.5">
            {dueDate.getFullYear()}年
          </span>
        </div>
      )}
      <div className="flex gap-1.5 mb-2">
        {DUE_QUICK.map(({ label, date }) => (
          <button
            key={label}
            type="button"
            onClick={() => handleQuickDue(date)}
            className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg border transition-all active:scale-95 ${
              dueDate?.toDateString() === date.toDateString()
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <select
          value={customYear}
          onChange={(e) =>
            handleCustomDue(e.target.value, customMonth, customDay)
          }
          className="w-24 border border-slate-200 rounded-xl px-2 py-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
        >
          <option value={THIS_YEAR}>{THIS_YEAR}年</option>
          <option value={THIS_YEAR + 1}>{THIS_YEAR + 1}年</option>
        </select>
        <select
          value={customMonth}
          onChange={(e) =>
            handleCustomDue(customYear, e.target.value, customDay)
          }
          className="flex-1 border border-slate-200 rounded-xl px-2 py-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
        >
          <option value="">月</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}月
            </option>
          ))}
        </select>
        <select
          value={customDay}
          onChange={(e) =>
            handleCustomDue(customYear, customMonth, e.target.value)
          }
          className="flex-1 border border-slate-200 rounded-xl px-2 py-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
        >
          <option value="">日</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}日
            </option>
          ))}
        </select>
        {dueDate && (
          <button
            type="button"
            onClick={clearDue}
            className="shrink-0 text-[11px] text-slate-400 hover:text-slate-600 px-1.5"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// カテゴリ選択
// ────────────────────────────────────────────
export function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const inputCls =
    "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition";
  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">
        カテゴリ（任意）
      </label>
      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? parseInt(e.target.value) : null)
        }
        className={`${inputCls} bg-white`}
      >
        <option value="">なし</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ────────────────────────────────────────────
// タスク編集モーダル
// ────────────────────────────────────────────
export default function EditTaskModal({
  task,
  onClose,
  onUpdate,
  onDelete,
  categories,
}: {
  task: Task;
  onClose: () => void;
  onUpdate: (updated: Task, categoryId: number | null) => void;
  onDelete: (id: number) => void;
  categories: Category[];
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(
    task.priority != null ? String(task.priority) : "",
  );
  const [categoryId, setCategoryId] = useState<number | null>(
    task.category?.id ?? null,
  );

  const initMins =
    task.estimated_hours != null ? Math.round(task.estimated_hours * 60) : null;
  const [durationMins, setDurationMins] = useState<number | null>(initMins);

  const initDue = task.due_date ? new Date(task.due_date) : null;
  const [dueDate, setDueDate] = useState<Date | null>(initDue);
  const [startAt, setStartAt] = useState<string>(
    isoToLocalDateTimeInput(task.start_time),
  );
  const [endAt, setEndAt] = useState<string>(
    isoToLocalDateTimeInput(task.end_time),
  );
  const [timeError, setTimeError] = useState<string | null>(null);

  function applyDurationFromRange(nextStart: string, nextEnd: string) {
    if (!nextStart || !nextEnd) return;
    const start = new Date(nextStart);
    const end = new Date(nextEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    const diffMins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (diffMins > 0) {
      setDurationMins(diffMins);
    }
  }

  function handleChangeStart(next: string) {
    setStartAt(next);
    setTimeError(null);
    applyDurationFromRange(next, endAt);
  }

  function handleChangeEnd(next: string) {
    setEndAt(next);
    setTimeError(null);
    applyDurationFromRange(startAt, next);
  }

  function clearRange() {
    setStartAt("");
    setEndAt("");
    setTimeError(null);
  }

  function handleSave() {
    if (!title.trim()) return;
    if ((startAt && !endAt) || (!startAt && endAt)) {
      setTimeError("開始時間と終了時間はセットで入力してください");
      return;
    }

    if (startAt && endAt) {
      const start = new Date(startAt);
      const end = new Date(endAt);
      if (end.getTime() <= start.getTime()) {
        setTimeError("終了時間は開始時間より後にしてください");
        return;
      }
    }

    const startIso = localDateTimeInputToIso(startAt);
    const endIso = localDateTimeInputToIso(endAt);
    const computedHours =
      startAt && endAt
        ? (new Date(endAt).getTime() - new Date(startAt).getTime()) / 3600000
        : durationMins != null
          ? durationMins / 60
          : null;

    onUpdate(
      {
        ...task,
        title: title.trim(),
        description: description.trim() || null,
        priority: priority !== "" ? (parseInt(priority) as 1 | 2 | 3) : null,
        estimated_hours: computedHours,
        due_date: dueDate ? toLocalDateStr(dueDate) : null,
        start_time: startIso,
        end_time: endIso,
      },
      categoryId,
    );
    onClose();
  }

  const inputCls =
    "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition";
  const labelCls = "text-[11px] font-semibold text-slate-500 mb-1.5 block";

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center pb-16 sm:pb-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 max-h-[90svh] overflow-y-auto">
        <div className="w-8 h-1 rounded-full bg-slate-200 mx-auto mb-5 sm:hidden" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-slate-900">タスクを編集</h2>
          <button
            onClick={() => onDelete(task.id)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label="タスクを削除"
          >
            🗑
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>
              タスク名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>詳細（任意）</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <label className={labelCls}>優先度</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={`${inputCls} bg-white`}
            >
              <option value="">未設定</option>
              <option value="1">高</option>
              <option value="2">中</option>
              <option value="3">低</option>
            </select>
          </div>
          <DurationInput initialMins={initMins} onChange={setDurationMins} />
          <div>
            <label className={labelCls}>開始時間・終了時間（任意）</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => handleChangeStart(e.target.value)}
                className={inputCls}
              />
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => handleChangeEnd(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[11px] text-slate-400">
                開始・終了を設定すると差分から工数を自動計算します
              </p>
              {(startAt || endAt) && (
                <button
                  type="button"
                  onClick={clearRange}
                  className="text-[11px] text-slate-400 hover:text-red-500 px-1"
                >
                  クリア
                </button>
              )}
            </div>
            {timeError && (
              <p className="text-[11px] text-red-500 mt-1">{timeError}</p>
            )}
          </div>
          <DueDateInput initialDate={initDue} onChange={setDueDate} />
          <CategorySelect
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
          />
        </div>
        <div className="flex gap-2.5 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 text-[13px] font-semibold hover:bg-slate-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}
