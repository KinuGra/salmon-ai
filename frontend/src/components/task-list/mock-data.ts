import { Task } from "./types";

const today = new Date();
const fmt = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const MOCK_TASKS: Task[] = [
  // ── AI見積もりと大きくズレているタスク ──────────────
  {
    id: 1,
    title: "認証APIの実装",
    description: "JWTトークン発行・検証エンドポイントの実装。Firebase Admin SDK連携も含む。",
    priority: 1,
    is_completed: false,
    estimated_hours: 2,
    ai_estimated_hours: 5, // ← ズレ大（+3h）
    due_date: fmt(0), // 今日
    category: { id: 1, name: "バックエンド", color: "#6366f1" },
  },
  {
    id: 2,
    title: "タスク一覧画面のUI実装",
    description: "shadcn/uiを使ったリストコンポーネントとソート機能の実装。",
    priority: 1,
    is_completed: false,
    estimated_hours: 3,
    ai_estimated_hours: 5.5, // ← ズレ大（+2.5h）
    due_date: fmt(1), // 明日
    category: { id: 2, name: "フロントエンド", color: "#ec4899" },
  },
  {
    id: 3,
    title: "DBスキーマ設計レビュー",
    description: null,
    priority: 2,
    is_completed: false,
    estimated_hours: 1,
    ai_estimated_hours: 2.5, // ← ズレ中（+1.5h）
    due_date: fmt(2),
    category: { id: 3, name: "設計", color: "#0ea5e9" },
  },

  // ── AI見積もりとほぼ一致しているタスク ───────────────
  {
    id: 4,
    title: "ユニットテストの追加",
    description: "Repository層のGoテスト。カバレッジ80%目標。",
    priority: 2,
    is_completed: false,
    estimated_hours: 2,
    ai_estimated_hours: 2.5, // ← ズレ小（許容範囲）
    due_date: fmt(3),
    category: { id: 1, name: "バックエンド", color: "#6366f1" },
  },
  {
    id: 5,
    title: "CORSミドルウェアの設定",
    description: null,
    priority: 2,
    is_completed: false,
    estimated_hours: 0.5,
    ai_estimated_hours: 0.5,
    due_date: fmt(4),
    category: { id: 1, name: "バックエンド", color: "#6366f1" },
  },
  {
    id: 6,
    title: "Figmaデザインカンプ確認",
    description: "タイムブロッキング画面のスペックを確認してコンポーネント設計に反映する。",
    priority: 3,
    is_completed: false,
    estimated_hours: 1,
    ai_estimated_hours: 1,
    due_date: fmt(5),
    category: { id: 4, name: "デザイン", color: "#10b981" },
  },

  // ── 完了済みタスク ────────────────────────────────────
  {
    id: 7,
    title: "Docker Composeのセットアップ",
    description: "PostgreSQL・Go・Python の3コンテナ構成。",
    priority: 1,
    is_completed: true,
    estimated_hours: 2,
    ai_estimated_hours: 2,
    due_date: fmt(-3),
    category: { id: 5, name: "インフラ", color: "#f59e0b" },
  },
  {
    id: 8,
    title: "Next.js プロジェクト初期設定",
    description: null,
    priority: 1,
    is_completed: true,
    estimated_hours: 1,
    ai_estimated_hours: 1,
    due_date: fmt(-5),
    category: { id: 2, name: "フロントエンド", color: "#ec4899" },
  },

  // ── due_date なしタスク ───────────────────────────────
  {
    id: 9,
    title: "README の整備",
    description: "セットアップ手順・アーキテクチャ概要・環境変数一覧を記載。",
    priority: 3,
    is_completed: false,
    estimated_hours: 1.5,
    ai_estimated_hours: null,
    due_date: null,
    category: { id: 6, name: "ドキュメント", color: "#8b5cf6" },
  },
];
