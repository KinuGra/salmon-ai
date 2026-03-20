"use client";

import React from "react";

// ────────────────────────────────────────────
// インライン記法パーサー（**bold** / *italic*）
// ────────────────────────────────────────────
function parseInline(text: string): React.ReactNode[] {
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // マッチ前のテキスト
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const raw = match[0];
    if (raw.startsWith("**") && raw.endsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-slate-900">
          {raw.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(
        <em key={key++} className="italic text-slate-600">
          {raw.slice(1, -1)}
        </em>
      );
    }
    lastIndex = match.index + raw.length;
  }

  // 残りのテキスト
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

// ────────────────────────────────────────────
// MarkdownRenderer
// ────────────────────────────────────────────
export default function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = k++;

    // ## 見出し2
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={key}
          className="text-[15px] font-bold text-slate-900 mt-7 mb-2.5 first:mt-0 pb-1.5 border-b border-slate-100"
        >
          {parseInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // ### 見出し3
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={key}
          className="text-[13px] font-semibold text-slate-700 mt-4 mb-2"
        >
          {parseInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // --- 水平線
    if (line.trim() === "---") {
      elements.push(
        <hr key={key} className="border-slate-200 my-5" />
      );
      i++;
      continue;
    }

    // - または * リスト（連続行をまとめてulに）
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const rawItems: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith("- ") || lines[i].startsWith("* "))
      ) {
        rawItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key} className="my-3 space-y-2">
          {rawItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="mt-[6px] w-[5px] h-[5px] rounded-full bg-slate-400 flex-shrink-0" />
              <span className="text-[13px] text-slate-700 leading-relaxed">
                {parseInline(item)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue; // i はすでに次の行を指している
    }

    // 空行はスキップ
    if (line.trim() === "") {
      i++;
      continue;
    }

    // 通常段落
    elements.push(
      <p key={key} className="text-[13px] text-slate-700 leading-relaxed mb-2">
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return <div>{elements}</div>;
}
