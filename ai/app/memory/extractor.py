"""
会話テキストから記憶すべき事実を抽出するモジュール。

- short: 今日の状態推定に使う一時的な事実（Redis に保存）
- long:  長期的な行動パターン・傾向（ChromaDB に保存）

抽出モデルは Gemini 2.0 Flash Lite を使用（安価・高速）。
"""

import json
import os
import re

from google import genai
from google.genai import types

EXTRACTION_PROMPT = """\
あなたはユーザーの行動支援アプリのメモリ管理システムです。
以下の会話から、将来の支援に役立つ「事実」だけを抽出してください。

抽出すべきもの:
- 行動パターン（例: 朝は集中できない、夜型）
- 苦手なタスク種別
- 有効だったアドバイスや戦略
- 感情・モチベーションの傾向
- 具体的な目標・制約

抽出すべきでないもの:
- 一時的な状況（「今日は雨だった」）
- 会話のやりとり自体
- 曖昧な感想

各事実について term を以下の基準で判定してください:
- "short": 今日の状態にのみ有効な一時的な事実
  例: 「今日は頭が痛い」「今日はやる気がない」「最近睡眠不足気味」
- "long": 長期的なパターン・傾向として蓄積すべき事実
  例: 「21時〜23時が最も集中できる」「レポート系タスクが苦手」

必ずJSON配列だけを返してください。説明文は不要です。

形式:
[{{"fact": "...", "category": "behavior|emotion|goal|strategy", "confidence": 0.0-1.0, "term": "short|long"}}]

会話:
{conversation}
"""


def extract_memories(messages: list[dict], user_message: str) -> list[dict]:
    """
    会話テキストから記憶すべき事実を抽出して返す。

    Args:
        messages: 過去の会話履歴 [{"role": "user"|"assistant", "content": "..."}]
        user_message: 今回のユーザー発言

    Returns:
        confidence >= 0.7 の事実リスト
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return []

    client = genai.Client(api_key=api_key)

    lines = []
    for msg in messages:
        role_label = "ユーザー" if msg["role"] == "user" else "AI"
        lines.append(f"{role_label}: {msg['content']}")
    lines.append(f"ユーザー: {user_message}")
    conversation = "\n".join(lines)

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=EXTRACTION_PROMPT.format(conversation=conversation),
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=1000,
            ),
        )
        raw = response.text.strip()

        # ```json ... ``` ブロックへの対応
        if "```" in raw:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
            if match:
                raw = match.group(1).strip()

        facts = json.loads(raw)
        return [f for f in facts if f.get("confidence", 0) >= 0.7]
    except Exception:
        return []
