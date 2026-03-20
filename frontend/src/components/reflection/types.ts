// ────────────────────────────────────────────
// 振り返り・自己分析 型定義
// ────────────────────────────────────────────

export type Report = {
  id: number;
  content: string; // Markdown形式の長文
  created_at: string;
};

export type Reflection = {
  id: number;
  date: string; // YYYY-MM-DD
  content: string | null;
  created_at: string;
};

export type ReflectionMessage = {
  id: number;
  reflection_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

// UI内部用
export type MobileTab = "report" | "chat" | "history";
export type LeftTab = "report" | "history";

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};
