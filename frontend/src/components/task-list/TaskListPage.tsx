"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Task } from "./types";
import { sortTasks } from "./utils";
import TaskListItem from "./TaskListItem";
import EditTaskModal, { Category } from "./EditTaskModal";

const API_BASE = "http://localhost:8080";

// ────────────────────────────────────────────
// 見積もり時間
// ────────────────────────────────────────────
const DURATION_QUICK: { label: string; mins: number }[] = [
  { label: "15m",  mins: 15  },
  { label: "30m",  mins: 30  },
  { label: "45m",  mins: 45  },
  { label: "1h",   mins: 60  },
  { label: "1.5h", mins: 90  },
  { label: "2h",   mins: 120 },
  { label: "3h",   mins: 180 },
  { label: "4h",   mins: 240 },
];

/** 分数 → "1h30m" 表示 */
function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

// ────────────────────────────────────────────
// 期限
// ────────────────────────────────────────────
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
/** 年・月・日を指定してDateを生成 */
function makeDueDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

/** Date → "M/D" 表示（データは年込みで管理、表示はMM/DDのみ） */
function fmtMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ────────────────────────────────────────────
// タスク追加モーダル
// ────────────────────────────────────────────
/** ローカル日付を "YYYY-MM-DD" 形式で返す（toISOString はUTC変換で日付がずれるため使わない） */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ────────────────────────────────────────────
// 共通: 見積もり時間入力
// ────────────────────────────────────────────
function DurationInput({
  initialMins,
  onChange,
}: {
  initialMins: number | null;
  onChange: (mins: number | null) => void;
}) {
  const [selectedMins, setSelectedMins] = useState<number | null>(initialMins);
  const [customH, setCustomH] = useState<string>("");
  const [customM, setCustomM] = useState<string>("0");

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
    const mins = h !== "" || m !== "0" ? parseInt(h || "0") * 60 + parseInt(m) : null;
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
      <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">見積もり時間</label>
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
        <span className="text-[13px] text-slate-500 font-medium shrink-0">h</span>
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
        <span className="text-[13px] text-slate-500 font-medium shrink-0">m</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// 共通: 期限入力
// ────────────────────────────────────────────
function DueDateInput({
  initialDate,
  onChange,
}: {
  initialDate: Date | null;
  onChange: (date: Date | null) => void;
}) {
  const today = new Date();
  const THIS_YEAR = today.getFullYear();
  const DUE_QUICK = [
    { label: "今日",  date: today             },
    { label: "明日",  date: addDays(today, 1) },
    { label: "3日後", date: addDays(today, 3) },
    { label: "来週",  date: addDays(today, 7) },
  ];

  const [dueDate, setDueDate] = useState<Date | null>(initialDate);
  const [customYear,  setCustomYear]  = useState<string>(String(initialDate?.getFullYear() ?? THIS_YEAR));
  const [customMonth, setCustomMonth] = useState<string>(initialDate ? String(initialDate.getMonth() + 1) : "");
  const [customDay,   setCustomDay]   = useState<string>(initialDate ? String(initialDate.getDate()) : "");

  function handleQuickDue(d: Date) {
    setDueDate(d);
    setCustomYear(String(d.getFullYear()));
    setCustomMonth(String(d.getMonth() + 1));
    setCustomDay(String(d.getDate()));
    onChange(d);
  }
  function handleCustomDue(year: string, month: string, day: string) {
    setCustomYear(year); setCustomMonth(month); setCustomDay(day);
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
    setDueDate(null); setCustomYear(String(THIS_YEAR)); setCustomMonth(""); setCustomDay("");
    onChange(null);
  }

  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">期限（任意）</label>
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
          onChange={(e) => handleCustomDue(e.target.value, customMonth, customDay)}
          className="w-24 border border-slate-200 rounded-xl px-2 py-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
        >
          <option value={THIS_YEAR}>{THIS_YEAR}年</option>
          <option value={THIS_YEAR + 1}>{THIS_YEAR + 1}年</option>
        </select>
        <select
          value={customMonth}
          onChange={(e) => handleCustomDue(customYear, e.target.value, customDay)}
          className="flex-1 border border-slate-200 rounded-xl px-2 py-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
        >
          <option value="">月</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m}月</option>
          ))}
        </select>
        <select
          value={customDay}
          onChange={(e) => handleCustomDue(customYear, customMonth, e.target.value)}
          className="flex-1 border border-slate-200 rounded-xl px-2 py-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition"
        >
          <option value="">日</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}日</option>
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
function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition";
  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">カテゴリ（任意）</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className={`${inputCls} bg-white`}
      >
        <option value="">なし</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}

// ────────────────────────────────────────────
// タスク追加モーダル
// ────────────────────────────────────────────
function AddTaskModal({
  onClose,
  onAdd,
  categories,
}: {
  onClose: () => void;
  onAdd: (task: Task, categoryId: number | null) => void;
  categories: Category[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [durationMins, setDurationMins] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  function handleAdd() {
    if (!title.trim()) return;
    const newTask: Task = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim() || null,
      priority: priority !== "" ? parseInt(priority) as 1 | 2 | 3 : null,
      is_completed: false,
      estimated_hours: durationMins != null ? durationMins / 60 : null,
      ai_estimated_hours: null,
      ai_estimation_reason: null,
      due_date: dueDate ? toLocalDateStr(dueDate) : null,
      start_time: null,
      end_time: null,
      achievement_rate: null,
      category: null,
    };
    onAdd(newTask, categoryId);
    onClose();
  }

  const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition";
  const labelCls = "text-[11px] font-semibold text-slate-500 mb-1.5 block";

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center pb-16 sm:pb-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 max-h-[90svh] overflow-y-auto">
        <div className="w-8 h-1 rounded-full bg-slate-200 mx-auto mb-5 sm:hidden" />
        <h2 className="text-[16px] font-bold text-slate-900 mb-4">タスクを追加</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>タスク名 <span className="text-red-400">*</span></label>
            <input
              type="text"
              placeholder="タスク名を入力..."
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${inputCls} ${!title.trim() ? "" : "border-indigo-300"}`}
            />
          </div>
          <div>
            <label className={labelCls}>詳細（任意）</label>
            <textarea
              placeholder="タスクの詳細を入力..."
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
          <DurationInput initialMins={null} onChange={setDurationMins} />
          <DueDateInput initialDate={null} onChange={setDueDate} />
          <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
        </div>
        <div className="flex gap-2.5 mt-6">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 text-[13px] font-semibold hover:bg-slate-200 transition-colors">
            キャンセル
          </button>
          <button
            onClick={handleAdd}
            disabled={!title.trim()}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            追加する
          </button>
        </div>
      </div>
    </div>
  );
}


// ────────────────────────────────────────────
// メインページ
// ────────────────────────────────────────────
export default function TaskListPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/tasks`).then((r) => r.json()),
      fetch(`${API_BASE}/categories`).then((r) => r.json()),
    ])
      .then(([tasks, categories]) => {
        setTasks(tasks);
        setCategories(categories);
      })
      .catch((e) => console.error("データ取得エラー:", e));
  }, []);

  const [editingTask, setEditingTask] = useState<Task | null>(null);

  async function handleUpdateTask(updated: Task, categoryId: number | null) {
    try {
      const res = await fetch(`${API_BASE}/tasks/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: updated.title, description: updated.description, ...(updated.priority != null ? { priority: updated.priority } : { clear_priority: true }), ...(updated.estimated_hours != null ? { estimated_hours: updated.estimated_hours } : { clear_estimated_hours: true }), due_date: updated.due_date, category_id: categoryId }),
      });
      if (!res.ok) { console.error("タスク更新エラー:", res.status, await res.text()); return; }
      const saved: Task = await res.json();
      setTasks((prev: Task[]) => prev.map((t) => (t.id === saved.id ? saved : t)));
    } catch (e) { console.error("タスク更新エラー:", e); }
  }

  async function handleDeleteTask(id: number) {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) { console.error("タスク削除エラー:", res.status, await res.text()); return; }
      setTasks((prev: Task[]) => prev.filter((t) => t.id !== id));
      setEditingTask(null);
    } catch (e) { console.error("タスク削除エラー:", e); }
  }

  async function handleToggleComplete(task: Task) {
    try {
      const res = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: !task.is_completed }),
      });
      if (!res.ok) { console.error("タスク更新エラー:", res.status, await res.text()); return; }
      const saved: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    } catch (e) { console.error("タスク更新エラー:", e); }
  }

  async function handleAddTask(task: Task, categoryId: number | null) {
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          priority: task.priority,
          estimated_hours: task.estimated_hours,
          due_date: task.due_date,
          category_id: categoryId,
        }),
      });
      if (!res.ok) { console.error("タスク追加エラー:", res.status, await res.text()); return; }
      const created: Task = await res.json();
      setTasks((prev: Task[]) => [created, ...prev]);
    } catch (e) {
      console.error("タスク追加エラー:", e);
    }
  }
  const [showAdd, setShowAdd] = useState(false);

  // BottomNav の + ボタンから ?new=1 で遷移してきた場合、モーダルを自動オープン
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowAdd(true);
      router.replace("/tasks");
    }
  }, [searchParams, router]);

  const [filter, setFilter] = useState<"all" | "active" | "done">("active");

  const filtered = tasks.filter((t) => {
    if (filter === "active") return !t.is_completed;
    if (filter === "done") return t.is_completed;
    return true;
  });
  const sorted = sortTasks(filtered);

  const activeCnt = tasks.filter((t) => !t.is_completed).length;
  const doneCnt = tasks.filter((t) => t.is_completed).length;

  // AI要注意タスク数（ズレが大きいもの）
  const alertCnt = tasks.filter(
    (t) =>
      !t.is_completed &&
      t.estimated_hours != null &&
      t.ai_estimated_hours != null &&
      Math.abs(t.ai_estimated_hours - t.estimated_hours) > 0.5
  ).length;

  return (
    <div className="flex flex-col bg-slate-50" style={{ height: "calc(100svh - var(--bottom-nav-height))" }}>
      {/* ── ヘッダー ── */}
      <div className="bg-white/90 backdrop-blur-sm flex-shrink-0 border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-0">
          {/* タイトル行 */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest leading-none mb-1">
                Tasks
              </p>
              <h1 className="text-[22px] font-bold text-slate-900 leading-tight">
                タスクリスト
              </h1>
              {/* サマリー */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[12px] text-slate-500">
                  未完了 <strong className="text-slate-800">{activeCnt}</strong> 件
                </span>
                {alertCnt > 0 && (
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    ！ AI要確認 {alertCnt}件
                  </span>
                )}
              </div>
            </div>

            {/* タスク追加ボタン */}
            <button
              onClick={() => setShowAdd(true)}
              className="w-11 h-11 rounded-2xl bg-indigo-600 text-white text-[22px] font-light flex items-center justify-center shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
              aria-label="タスクを追加"
            >
              +
            </button>
          </div>

          {/* フィルタータブ */}
          <div className="flex gap-0">
            {(
              [
                { key: "all", label: "すべて", cnt: tasks.length },
                { key: "active", label: "未完了", cnt: activeCnt },
                { key: "done", label: "完了済み", cnt: doneCnt },
              ] as const
            ).map(({ key, label, cnt }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold border-b-2 transition-colors ${
                  filter === key
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {label}
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    filter === key
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {cnt}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── タスクリスト ── */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[14px] text-slate-400 font-medium">
              {filter === "done" ? "完了済みタスクはありません" : "タスクはありません"}
            </p>
            {filter === "active" && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-3 text-[12px] text-indigo-600 font-semibold hover:underline"
              >
                最初のタスクを追加する →
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sorted.map((task) => (
              <TaskListItem key={task.id} task={task} onEdit={() => setEditingTask(task)} onToggleComplete={() => handleToggleComplete(task)} />
            ))}
          </div>
        )}
      </div>
      </div>

      {/* ── タスク追加モーダル ── */}
      {showAdd && (
        <AddTaskModal onClose={() => setShowAdd(false)} onAdd={handleAddTask} categories={categories} />
      )}

      {/* ── タスク編集モーダル ── */}
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
