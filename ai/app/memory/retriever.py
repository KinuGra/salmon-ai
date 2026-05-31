"""
Hybrid Retrieval モジュール。

最終スコア = コサイン類似度 × 0.7 + Recency スコア × 0.3

Recency の decay_days はカテゴリごとに異なる:
- behavior : 30日（習慣・行動パターン）
- strategy : 60日（有効だった戦略）
- goal     : 180日（目標・制約）
- emotion  : 7日（感情・モチベーション）
"""

import math
from datetime import datetime, timezone

from app.memory.storage import get_short_term, query_long_term

_DECAY_DAYS: dict[str, float] = {
    "behavior": 30.0,
    "strategy": 60.0,
    "goal": 180.0,
    "emotion": 7.0,
}
_DEFAULT_DECAY_DAYS = 30.0


def _recency_score(created_at_str: str, decay_days: float) -> float:
    """指数減衰で Recency スコアを計算する（0〜1）。"""
    try:
        created_at = datetime.fromisoformat(created_at_str)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        days_elapsed = (datetime.now(timezone.utc) - created_at).days
        return math.exp(-days_elapsed / decay_days)
    except Exception:
        return 0.5  # パース失敗時は中間値


def retrieve_long_term(
    user_id: str,
    query: str,
    k: int = 5,
    category: str | None = None,
) -> list[dict]:
    """
    Hybrid Retrieval で長期記憶トップ k 件を返す。

    Returns:
        [{"fact", "category", "score", "created_at"}]
    """
    candidates = query_long_term(user_id, query, n_results=k * 3, category=category)
    if not candidates:
        return []

    scored = []
    for item in candidates:
        semantic_score = max(0.0, 1.0 - item["distance"])  # cosine距離 → 類似度
        decay_days = _DECAY_DAYS.get(item["category"], _DEFAULT_DECAY_DAYS)
        rec_score = _recency_score(item["created_at"], decay_days)
        hybrid_score = semantic_score * 0.7 + rec_score * 0.3
        scored.append({
            "fact": item["fact"],
            "category": item["category"],
            "score": hybrid_score,
            "created_at": item["created_at"],
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:k]


def retrieve_short_term(user_id: str) -> list[dict]:
    """今日の短期記憶を返す。"""
    return get_short_term(user_id)


def get_full_context(user_id: str, query: str) -> dict:
    """
    レポート・プロンプト注入用にまとめて取得する。

    Returns:
        {
          "behavior_patterns": [...],
          "effective_strategies": [...],
          "today_state": [...],
        }
    """
    return {
        "behavior_patterns": retrieve_long_term(user_id, query, k=3, category="behavior"),
        "effective_strategies": retrieve_long_term(user_id, query, k=2, category="strategy"),
        "today_state": retrieve_short_term(user_id),
    }
