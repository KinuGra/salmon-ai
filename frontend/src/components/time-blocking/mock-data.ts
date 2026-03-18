import { Task } from "./types";

const today = new Date();
const d = (h: number, m = 0) => {
  const dt = new Date(today);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
};
const due = (offsetDays: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
};

export const MOCK_TASKS: Task[] = [
  {
    id: 1,
    title: "認証APIの実装",
    description: "Firebase Auth との連携",
    priority: 1,
    is_completed: false,
    estimated_hours: 3,
    ai_estimated_hours: 4.5,
    start_time: d(9),
    end_time: d(12),
    due_date: due(0),
    achievement_rate: 70,
    category: { id: 1, name: "開発", color: "#6366f1" },
  },
  {
    id: 2,
    title: "デザインレビュー",
    description: null,
    priority: 2,
    is_completed: false,
    estimated_hours: 1,
    ai_estimated_hours: 1,
    start_time: d(13),
    end_time: d(14),
    due_date: due(1),
    achievement_rate: null,
    category: { id: 2, name: "デザイン", color: "#ec4899" },
  },
  {
    id: 3,
    title: "週次ミーティング",
    description: "スプリントレビュー",
    priority: 2,
    is_completed: true,
    estimated_hours: 1,
    ai_estimated_hours: 1,
    start_time: d(14, 30),
    end_time: d(15, 30),
    due_date: due(0),
    achievement_rate: 100,
    category: { id: 3, name: "MTG", color: "#f59e0b" },
  },
  {
    id: 4,
    title: "タイムライン画面のレスポンシブ対応",
    description: null,
    priority: 1,
    is_completed: false,
    estimated_hours: 2,
    ai_estimated_hours: 2,
    start_time: d(16),
    end_time: d(18),
    due_date: due(0),
    achievement_rate: 30,
    category: { id: 1, name: "開発", color: "#6366f1" },
  },
  // 未配置タスク（インボックス）
  {
    id: 5,
    title: "テスト実装",
    description: null,
    priority: 1,
    is_completed: false,
    estimated_hours: 2,
    ai_estimated_hours: null,
    start_time: null,
    end_time: null,
    due_date: due(1),
    achievement_rate: null,
    category: { id: 1, name: "開発", color: "#6366f1" },
  },
  {
    id: 6,
    title: "ドキュメント更新",
    description: null,
    priority: 3,
    is_completed: false,
    estimated_hours: 0.5,
    ai_estimated_hours: null,
    start_time: null,
    end_time: null,
    due_date: due(3),
    achievement_rate: null,
    category: { id: 4, name: "その他", color: "#14b8a6" },
  },
  {
    id: 7,
    title: "バグ修正: ログイン画面",
    description: null,
    priority: 1,
    is_completed: false,
    estimated_hours: 1,
    ai_estimated_hours: null,
    start_time: null,
    end_time: null,
    due_date: due(0),
    achievement_rate: null,
    category: { id: 1, name: "開発", color: "#6366f1" },
  },
  {
    id: 8,
    title: "採用面談フィードバック記入",
    description: null,
    priority: 2,
    is_completed: false,
    estimated_hours: 0.5,
    ai_estimated_hours: null,
    start_time: null,
    end_time: null,
    due_date: due(2),
    achievement_rate: null,
    category: { id: 5, name: "管理", color: "#8b5cf6" },
  },
];
