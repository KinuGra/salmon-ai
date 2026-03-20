"use client";

import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8080";

const GRASS_WEEKS = 16;

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

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function GrassGraph() {
  const [data, setData] = useState<Record<string, number>>({});
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
    fetch(`${API_BASE}/stats/grass?weeks=${GRASS_WEEKS}`)
      .then((r) => r.json())
      .then((d) => setData(d.data ?? {}));
  }, []);

  if (!today) return null;

  // GRASS_WEEKS 週前の月曜日を起点にする
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - GRASS_WEEKS * 7 + 1);
  const dow = startDate.getDay() || 7; // 1=月 〜 7=日
  startDate.setDate(startDate.getDate() - (dow - 1));

  // 全日付を生成して週ごとに分割
  const cols: Date[][] = [];
  const cur = new Date(startDate);
  while (cur <= today) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    cols.push(week);
  }

  function grassColor(count: number): string {
    if (count === 0) return "bg-slate-100";
    if (count === 1) return "bg-emerald-200";
    if (count <= 3) return "bg-emerald-300";
    if (count <= 5) return "bg-emerald-500";
    return "bg-emerald-700";
  }

  const todayStr = toDateStr(today);
  const dayLabels = ["月", "", "水", "", "金", "", ""];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {/* 曜日ラベル */}
        <div className="flex flex-col gap-[3px] mr-0.5 pt-4">
          {dayLabels.map((label, i) => (
            <div key={i} className="w-[11px] h-[11px] flex items-center justify-end">
              <span className="text-[8px] text-slate-400 leading-none">{label}</span>
            </div>
          ))}
        </div>

        {/* 週列 */}
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {/* 日マス */}
            {col.map((date, di) => {
              const str = toDateStr(date);
              const count = data[str] ?? 0;
              const isToday = str === todayStr;
              const isFuture = date > today;
              return (
                <div
                  key={di}
                  title={isFuture ? "" : `${str}  ${count}件完了`}
                  className={[
                    "w-[11px] h-[11px] rounded-[2px] transition-colors",
                    isFuture ? "bg-slate-50" : grassColor(count),
                    isToday ? "ring-1 ring-indigo-400 ring-offset-[1px]" : "",
                  ].join(" ")}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-[9px] text-slate-400">少</span>
        {["bg-slate-100", "bg-emerald-200", "bg-emerald-300", "bg-emerald-500", "bg-emerald-700"].map((cls, i) => (
          <div key={i} className={`w-[11px] h-[11px] rounded-[2px] ${cls}`} />
        ))}
        <span className="text-[9px] text-slate-400">多</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-1">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-[36px] font-bold text-slate-800 leading-none tabular-nums">{value}</span>
      {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
    </div>
  );
}

function DiffBadge({ current, previous, periodLabel }: { current: number; previous: number; periodLabel: string }) {
  const diff = current - previous;
  if (diff === 0) return <span className="text-slate-400 text-[11px]">{periodLabel}と同じ</span>;
  const positive = diff > 0;
  return (
    <span className={`text-[11px] font-bold ${positive ? "text-emerald-500" : "text-red-400"}`}>
      {positive ? "+" : ""}{diff} {periodLabel}比
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
    <div className="flex flex-col bg-slate-50" style={{ height: "calc(100svh - var(--bottom-nav-height))" }}>
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 pt-8">
        <h1 className="text-[22px] font-bold text-slate-900 mb-6">統計・進捗サマリー</h1>

        {/* 草グラフ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <p className="text-[11px] font-semibold text-slate-400 mb-3">完了の記録（過去{GRASS_WEEKS}週）</p>
          <GrassGraph />
        </div>

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
                <StatCard label="活動日数" value={stats.current.grass_count} sub="日" />
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
                  <span className="text-[22px] font-bold text-slate-700 tabular-nums">{stats.current.completed_count}</span>
                  <DiffBadge current={stats.current.completed_count} previous={stats.previous.completed_count} periodLabel={periodLabel} />
                </div>
                <div className="w-px bg-slate-100" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[11px] text-slate-400">活動日数</span>
                  <span className="text-[22px] font-bold text-slate-700 tabular-nums">{stats.current.grass_count}</span>
                  <DiffBadge current={stats.current.grass_count} previous={stats.previous.grass_count} periodLabel={periodLabel} />
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
    </div>
  );
}
