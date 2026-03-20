"use client";

import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8080";

type StatsData = {
  completed_count: number;
  achievement_counts: Record<number, number>;
  grass_count: number;
};

type StatsResponse = {
  current: StatsData;
  previous: StatsData;
};

type CommentResponse = {
  comment: string;
  follow_message: string;
};

const ACHIEVEMENT_LABELS: Record<number, string> = {
  100: "100%",
  70: "70%",
  30: "30%",
  0: "0%",
};

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-1">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-[36px] font-bold text-slate-800 leading-none tabular-nums">{value}</span>
      {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
    </div>
  );
}

function DiffBadge({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff === 0) return <span className="text-slate-400 text-[11px]">先週と同じ</span>;
  const positive = diff > 0;
  return (
    <span className={`text-[11px] font-bold ${positive ? "text-emerald-500" : "text-red-400"}`}>
      {positive ? "+" : ""}{diff} 先週比
    </span>
  );
}

function AchievementBar({ counts }: { counts: Record<number, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-[12px] text-slate-400">データなし</p>;

  const colors: Record<number, string> = {
    100: "bg-emerald-400",
    70: "bg-indigo-400",
    30: "bg-amber-400",
    0: "bg-red-300",
  };

  return (
    <div className="flex flex-col gap-1.5">
      {[100, 70, 30, 0].map((rate) => {
        const count = counts[rate] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={rate} className="flex items-center gap-2">
            <span className="w-8 text-right text-[11px] text-slate-500">{ACHIEVEMENT_LABELS[rate]}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className={`${colors[rate]} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-6 text-[11px] text-slate-500 tabular-nums">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const [tab, setTab] = useState<"weekly" | "monthly">("weekly");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState<CommentResponse | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setStats(null);
    setComment(null);
    fetch(`${API_BASE}/stats/${tab}`)
      .then((r) => r.json())
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, [tab]);

  async function handleGetComment() {
    if (!stats) return;
    setCommentLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai/stats/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: stats.current, previous: stats.previous }),
      });
      const data = await res.json();
      setComment(data);
    } finally {
      setCommentLoading(false);
    }
  }

  const periodLabel = tab === "weekly" ? "先週" : "先月";

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-lg mx-auto px-4 pt-8">
        <h1 className="text-[22px] font-bold text-slate-900 mb-6">統計・進捗サマリー</h1>

        {/* タブ */}
        <div className="flex gap-2 mb-6 bg-white border border-slate-100 rounded-2xl p-1 shadow-sm">
          {(["weekly", "monthly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all ${
                tab === t ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "weekly" ? "週次" : "月次"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : stats ? (
          <>
            {/* 今週/今月 */}
            <section className="mb-6">
              <h2 className="text-[13px] font-semibold text-slate-500 mb-3">{tab === "weekly" ? "今週" : "今月"}</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <StatCard label="完了タスク" value={stats.current.completed_count} sub="件" />
                <StatCard label="草の数" value={stats.current.grass_count} sub="日" />
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <p className="text-[11px] font-semibold text-slate-400 mb-3">達成度別内訳</p>
                <AchievementBar counts={stats.current.achievement_counts} />
              </div>
            </section>

            {/* 前週/前月との比較 */}
            <section className="mb-6">
              <h2 className="text-[13px] font-semibold text-slate-500 mb-3">{periodLabel}との比較</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex gap-6">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[11px] text-slate-400">完了タスク</span>
                  <span className="text-[22px] font-bold text-slate-700 tabular-nums">{stats.previous.completed_count}</span>
                  <DiffBadge current={stats.current.completed_count} previous={stats.previous.completed_count} />
                </div>
                <div className="w-px bg-slate-100" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[11px] text-slate-400">草の数</span>
                  <span className="text-[22px] font-bold text-slate-700 tabular-nums">{stats.previous.grass_count}</span>
                  <DiffBadge current={stats.current.grass_count} previous={stats.previous.grass_count} />
                </div>
              </div>
            </section>

            {/* AIコメント */}
            <section>
              <button
                onClick={handleGetComment}
                disabled={commentLoading}
                className="w-full py-3 rounded-2xl bg-indigo-600 text-white text-[13px] font-bold shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {commentLoading ? "AIが分析中..." : "AIにコメントをもらう"}
              </button>
              {comment && (
                <div className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3">
                  <p className="text-[13px] text-slate-700 leading-relaxed">{comment.comment}</p>
                  <p className="text-[12px] text-indigo-500 font-semibold leading-relaxed">{comment.follow_message}</p>
                </div>
              )}
            </section>
          </>
        ) : (
          <p className="text-center text-slate-400 text-[13px] py-16">データを取得できませんでした</p>
        )}
      </div>
    </div>
  );
}
