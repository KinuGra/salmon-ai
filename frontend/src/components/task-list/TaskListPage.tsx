"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Task } from "./types";
import { sortTasks } from "./utils";
import TaskListItem from "./TaskListItem";
import EditTaskModal, { Category, DurationInput, DueDateInput, CategorySelect, toLocalDateStr } from "./EditTaskModal";

const API_BASE = "http://localhost:8080";

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
      const body: Record<string, unknown> = {
        title: updated.title,
        description: updated.description,
        due_date: updated.due_date,
        category_id: categoryId,
      };
      if (updated.priority != null) {
        body.priority = updated.priority;
      } else {
        body.clear_priority = true;
      }
      if (updated.estimated_hours != null) {
        body.estimated_hours = updated.estimated_hours;
      } else {
        body.clear_estimated_hours = true;
      }
      const res = await fetch(`${API_BASE}/tasks/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

      // AI見積もりは非同期で実行されるため、完了後にタスクをリフェッチして反映
      setTimeout(async () => {
        try {
          const updated = await fetch(`${API_BASE}/tasks`).then((r) => r.json());
          setTasks(updated);
        } catch (e) {
          console.error("AI見積もりリフェッチエラー:", e);
        }
      }, 5000);
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
