"use client";

import { useState, useEffect } from "react";
import { Report } from "./types";
import MarkdownRenderer from "./MarkdownRenderer";

type Status = "idle" | "loading" | "done";

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReportView({ report }: { report: Report }) {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (status !== "done") return;
    const timer = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  function handleGenerate() {
    if (status === "loading") return;
    setStatus("loading");
    // TODO: POST /ai/report/generate
    console.log("[API] POST /ai/report/generate");
    setTimeout(() => {
      setStatus("done");
    }, 2200);
  }

  return (
    <div className="flex flex-col h-full">
      {/* スクロールコンテンツ */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* メタ情報 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest leading-none mb-1">
              Self Analysis
            </p>
            <h2 className="text-[18px] font-bold text-slate-900 leading-tight">
              自己分析レポート
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 leading-tight text-right">
            最終更新<br />
            {formatDate(report.created_at)}
          </span>
        </div>

        {/* レポート本文 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <MarkdownRenderer content={report.content} />
        </div>

        {/* 下部の余白 */}
        <div className="h-4" />
      </div>

      {/* 生成ボタン（固定フッター） */}
      <div className="border-t border-slate-100 bg-white px-4 py-3">
        <button
          onClick={handleGenerate}
          disabled={status === "loading"}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-[0.98] ${
            status === "loading"
              ? "bg-indigo-100 text-indigo-400 cursor-not-allowed"
              : status === "done"
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md"
          }`}
        >
          {status === "loading" ? (
            <>
              <span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              AIがレポートを生成中...
            </>
          ) : status === "done" ? (
            <>
              <span className="text-[15px] leading-none">✓</span>
              レポートを更新しました
            </>
          ) : (
            <>
              <span className="text-[14px] leading-none">✦</span>
              AIでレポートを生成 / 更新
            </>
          )}
        </button>
        <p className="text-center text-[10px] text-slate-400 mt-2">
          過去30日間のデータをもとに再生成します
        </p>
      </div>
    </div>
  );
}
