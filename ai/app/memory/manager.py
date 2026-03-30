"""
記憶の更新・矛盾解決・クリーンアップを担当するモジュール。

保存フロー:
  1. 抽出された事実を short / long に振り分け
  2. long: 類似度 >= 0.85 の既存記憶がある場合のみ LLM で矛盾チェック
  3. action == "delete" → 既存削除して新規保存
     action == "keep"   → スキップ
     その他              → 通常保存
  4. short: Redis に当日エントリとして追加
"""

import json
import os

from google import genai
from google.genai import types

from app.memory.storage import (
    delete_long_term_by_fact,
    get_all_long_term_metadata,
    query_long_term,
    save_long_term,
    save_short_term,
)

_CONTRADICTION_PROMPT = """\
以下の「既存の記憶」と「新しい事実」を比較してください。
矛盾や上書きが必要な場合はJSONで返してください。

既存の記憶: {existing}
新しい事実: {new_fact}

返却形式（JSONのみ、説明不要）:
{{"action": "keep"|"update"|"delete", "reason": "..."}}
"""

_CONTRADICTION_SIMILARITY_THRESHOLD = 0.85
_MAX_LONG_TERM_MEMORIES = 200


def _check_contradiction(existing_fact: str, new_fact: str) -> str:
    """LLM に矛盾チェックを依頼し action 文字列を返す。失敗時は "save"。"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "save"

    client = genai.Client(api_key=api_key)
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=_CONTRADICTION_PROMPT.format(
                existing=existing_fact,
                new_fact=new_fact,
            ),
            config=types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=200,
            ),
        )
        result = json.loads(response.text.strip())
        return result.get("action", "save")
    except Exception:
        return "save"


def save_memories(user_id: str, facts: list[dict]) -> None:
    """
    抽出された事実を short / long に振り分けて保存する。

    - term == "short" → Redis
    - term == "long"  → ChromaDB（矛盾チェックあり）
    """
    short_facts = [f for f in facts if f.get("term") == "short"]
    long_facts = [f for f in facts if f.get("term") == "long"]

    if short_facts:
        save_short_term(user_id, short_facts)

    for fact in long_facts:
        _save_long_term_with_conflict_check(user_id, fact)


def _save_long_term_with_conflict_check(user_id: str, fact: dict) -> None:
    """類似度の高い既存記憶がある場合のみ矛盾チェックを行い、長期記憶を保存する。"""
    candidates = query_long_term(user_id, fact["fact"], n_results=3)

    for candidate in candidates:
        similarity = max(0.0, 1.0 - candidate["distance"])
        if similarity < _CONTRADICTION_SIMILARITY_THRESHOLD:
            continue

        action = _check_contradiction(candidate["fact"], fact["fact"])

        if action == "delete":
            delete_long_term_by_fact(user_id, candidate["fact"])
            break  # 既存を削除したら保存へ進む
        elif action == "keep":
            return  # 既存で十分なのでスキップ
        # "update" or "save" → そのまま通常保存

    save_long_term(user_id, fact)


def cleanup_old_memories(user_id: str) -> None:
    """
    長期記憶が MAX を超えた場合、スコアの低い記憶を削除する。
    スコア = access_count × 0.5 + recency × 0.5
    """
    import math
    from datetime import datetime, timezone

    ids, metadatas = get_all_long_term_metadata(user_id)
    if len(ids) <= _MAX_LONG_TERM_MEMORIES:
        return

    def _recency(created_at_str: str) -> float:
        try:
            dt = datetime.fromisoformat(created_at_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            days = (datetime.now(timezone.utc) - dt).days
            return math.exp(-days / 30.0)
        except Exception:
            return 0.0

    scored = []
    for id_, meta in zip(ids, metadatas):
        score = (
            int(meta.get("access_count", 0)) * 0.5
            + _recency(meta.get("created_at", "")) * 0.5
        )
        scored.append((id_, score))

    scored.sort(key=lambda x: x[1])
    to_delete = [id_ for id_, _ in scored[: len(scored) - _MAX_LONG_TERM_MEMORIES]]

    if to_delete:
        from app.memory.storage import _get_collection
        _get_collection().delete(ids=to_delete)
