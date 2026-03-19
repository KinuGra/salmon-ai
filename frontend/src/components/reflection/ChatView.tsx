"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./types";
import { MOCK_AI_RESPONSES } from "./mock-data";

// ────────────────────────────────────────────
// 定数
// ────────────────────────────────────────────
const STREAM_INTERVAL_MS = 18; // 1文字あたりのストリーミング間隔
const THINKING_DELAY_MS = 650; // 返答開始までの「考え中」時間

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 0,
    role: "assistant",
    content:
      "今日はどうだった？タスクの進み具合や出来事を気軽に話してみよう。",
  },
];

let responseIdx = 0;
function getNextAiResponse(): string {
  const r = MOCK_AI_RESPONSES[responseIdx % MOCK_AI_RESPONSES.length];
  responseIdx++;
  return r;
}

// ────────────────────────────────────────────
// チュートリアルバナー
// ────────────────────────────────────────────
function TutorialBanner({ onClose }: { onClose: () => void }) {
  return (
    <div className="mx-4 mt-4 mb-1 bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[11px] font-bold text-indigo-700 mb-1">
            振り返りが成長を加速する
          </p>
          <p className="text-[11px] text-indigo-600/80 leading-relaxed">
            毎日の振り返りは自己認識を高め、翌日のパフォーマンスを平均
            <strong className="font-semibold"> 22% </strong>
            向上させます。AIと対話しながら今日の学びを言語化しましょう。
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-[11px] text-indigo-400 hover:text-indigo-600 transition-colors flex-shrink-0 mt-0.5"
          aria-label="閉じる"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// ローディングドット（AI思考中）
// ────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex justify-start px-4 mb-3">
      <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5 h-4">
          <span
            className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: "-0.3s" }}
          />
          <span
            className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: "-0.15s" }}
          />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// チャットバブル
// ────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 mb-3">
        <div className="max-w-[75%] bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm">
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
            {msg.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start px-4 mb-3">
      <div className="max-w-[82%]">
        <p className="text-[10px] text-slate-400 font-semibold mb-1 ml-1">
          ✦ AI
        </p>
        <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
          <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap">
            {msg.content}
            {msg.isStreaming && (
              <span className="inline-block w-[2px] h-[14px] bg-slate-500 ml-0.5 align-text-bottom animate-pulse" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// メインチャットビュー
// ────────────────────────────────────────────
export default function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [showTutorial, setShowTutorial] = useState(true);
  const [isThinking, setIsThinking] = useState(false); // 返答前のドット表示
  const [isStreaming, setIsStreaming] = useState(false); // ストリーミング中

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 新メッセージが追加されたら最下部へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // textareaの高さを自動調整
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  // アンマウント時にタイマークリア
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
    };
  }, []);

  function handleSend() {
    const text = input.trim();
    if (!text || isThinking || isStreaming) return;

    // ユーザーメッセージを追加
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    // 「考え中」→ストリーミング開始
    streamTimerRef.current = setTimeout(() => {
      setIsThinking(false);

      const fullText = getNextAiResponse();
      const aiMsgId = Date.now() + 1;

      // 空のAIメッセージ（isStreaming=true）を追加
      setMessages((prev) => [
        ...prev,
        { id: aiMsgId, role: "assistant", content: "", isStreaming: true },
      ]);
      setIsStreaming(true);

      // 文字単位でストリーミング
      let charIdx = 0;
      function tick() {
        charIdx++;
        const partial = fullText.slice(0, charIdx);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, content: partial } : m
          )
        );

        if (charIdx < fullText.length) {
          streamTimerRef.current = setTimeout(tick, STREAM_INTERVAL_MS);
        } else {
          // ストリーミング完了
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId ? { ...m, isStreaming: false } : m
            )
          );
          setIsStreaming(false);
        }
      }

      streamTimerRef.current = setTimeout(tick, STREAM_INTERVAL_MS);
    }, THINKING_DELAY_MS);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isBusy = isThinking || isStreaming;

  return (
    <div className="flex flex-col h-full">
      {/* ── ヘッダー（デスクトップ右パネル用） ── */}
      <div className="px-4 pt-4 pb-2 border-b border-slate-100 hidden lg:block">
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest leading-none mb-0.5">
          Reflection
        </p>
        <h2 className="text-[15px] font-bold text-slate-900">AIと振り返る</h2>
      </div>

      {/* ── メッセージエリア ── */}
      <div className="flex-1 overflow-y-auto">
        {/* チュートリアルバナー */}
        {showTutorial && (
          <TutorialBanner onClose={() => setShowTutorial(false)} />
        )}

        {/* 日付ラベル */}
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex-1 border-t border-slate-100" />
          <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
            今日
          </span>
          <div className="flex-1 border-t border-slate-100" />
        </div>

        {/* メッセージ一覧 */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {/* 思考中ドット */}
        {isThinking && <ThinkingDots />}

        {/* スクロール追尾アンカー */}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* ── 入力エリア ── */}
      <div className="border-t border-slate-100 bg-white px-3 py-3">
        <div
          className={`flex items-end gap-2 bg-slate-50 border rounded-2xl px-3.5 py-2.5 transition-colors ${
            isBusy ? "border-slate-200" : "border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isBusy ? "AIが返答中..." : "今日のことを話してみよう... (Enterで送信)"
            }
            disabled={isBusy}
            rows={1}
            className="flex-1 resize-none bg-transparent text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none leading-relaxed disabled:cursor-not-allowed"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isBusy}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-600 text-white text-[14px] font-bold flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed mb-0.5"
            aria-label="送信"
          >
            ↑
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-1.5">
          Shift+Enter で改行
        </p>
      </div>
    </div>
  );
}
