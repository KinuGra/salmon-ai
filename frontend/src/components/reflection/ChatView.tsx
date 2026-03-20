"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage, ReflectionMessage } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 0,
    role: "assistant",
    content: "今日はどうだった？タスクの進み具合や出来事を気軽に話してみよう。",
  },
];

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
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }} />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }} />
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
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start px-4 mb-3">
      <div className="max-w-[82%]">
        <p className="text-[10px] text-slate-400 font-semibold mb-1 ml-1">✦ AI</p>
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
export default function ChatView({ reflectionId }: { reflectionId: number | null }) {
  const [messages, setMessages]         = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput]               = useState("");
  const [showTutorial, setShowTutorial] = useState(true);
  const [isThinking, setIsThinking]     = useState(false);
  const [isStreaming, setIsStreaming]    = useState(false);
  const [cooldown, setCooldown]         = useState(0); // 残り秒数
  const cooldownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nextId      = useRef(1);

  function startCooldown(seconds: number) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // アンマウント時にEventSourceをクリーンアップ
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // 既存メッセージを読み込み
  useEffect(() => {
    if (!reflectionId) return;
    fetch(`${API_BASE}/reflections/${reflectionId}/messages`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ReflectionMessage[]) => {
        if (data.length === 0) return;
        const loaded: ChatMessage[] = data.map((m) => ({
          id: nextId.current++,
          role: m.role,
          content: m.content,
        }));
        setMessages([INITIAL_MESSAGES[0], ...loaded]);
        setShowTutorial(false);
      })
      .catch((err) => console.error("Failed to fetch messages:", err));
  }, [reflectionId]);

  // 新メッセージで最下部へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // textarea 高さ自動調整
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  function handleSend() {
    const text = input.trim();
    if (!text || isThinking || isStreaming || !reflectionId) return;

    const userMsg: ChatMessage = { id: nextId.current++, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    const aiMsgId = nextId.current++;
    const url = `${API_BASE}/ai/reflection/stream?reflection_id=${reflectionId}&message=${encodeURIComponent(text)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("message", (e) => {
      const chunk: string = e.data;

      if (chunk.startsWith("ratelimit:")) {
        const msg = chunk.replace(/^ratelimit:\s*/, "");
        const sec = parseInt(msg);
        setIsThinking(false);
        setIsStreaming(false);
        if (!isNaN(sec)) startCooldown(sec);
        setMessages((prev) => [
          ...prev,
          { id: aiMsgId, role: "assistant", content: `⏳ ${msg}` },
        ]);
        es.close();
        eventSourceRef.current = null;
        return;
      }

      if (chunk.startsWith("error:")) {
        setIsThinking(false);
        setIsStreaming(false);
        setMessages((prev) => [
          ...prev,
          { id: aiMsgId, role: "assistant", content: chunk.replace(/^error:\s*/, "") },
        ]);
        es.close();
        eventSourceRef.current = null;
        return;
      }

      setIsThinking(false);
      setIsStreaming(true);

      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === aiMsgId);
        if (idx === -1) {
          return [...prev, { id: aiMsgId, role: "assistant", content: chunk, isStreaming: true }];
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], content: updated[idx].content + chunk };
        return updated;
      });
    });

    es.onerror = () => {
      setIsThinking(false);
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, isStreaming: false } : m))
      );
      es.close();
      eventSourceRef.current = null;
    };
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isBusy  = isThinking || isStreaming || cooldown > 0;
  const canSend = !!input.trim() && !isBusy && !!reflectionId;

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー（デスクトップ） */}
      <div className="px-4 pt-4 pb-2 border-b border-slate-100 hidden lg:block">
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest leading-none mb-0.5">
          Reflection
        </p>
        <h2 className="text-[15px] font-bold text-slate-900">AIと振り返る</h2>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto">
        {showTutorial && <TutorialBanner onClose={() => setShowTutorial(false)} />}

        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex-1 border-t border-slate-100" />
          <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">今日</span>
          <div className="flex-1 border-t border-slate-100" />
        </div>

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {isThinking && <ThinkingDots />}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* 入力エリア */}
      <div className="border-t border-slate-100 bg-white px-3 py-3">
        <div className={`flex items-end gap-2 bg-slate-50 border rounded-2xl px-3.5 py-2.5 transition-colors ${
          isBusy
            ? "border-slate-200"
            : "border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100"
        }`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !reflectionId     ? "読み込み中..." :
              cooldown > 0      ? `${cooldown}秒後に送信できます...` :
              isThinking || isStreaming ? "AIが返答中..." :
              "今日のことを話してみよう... (Enterで送信)"
            }
            disabled={isBusy || !reflectionId}
            rows={1}
            className="flex-1 resize-none bg-transparent text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none leading-relaxed disabled:cursor-not-allowed"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
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
