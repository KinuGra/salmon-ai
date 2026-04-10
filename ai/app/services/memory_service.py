"""
メモリ抽出・保存のビジネスロジックを担当するサービス。

振り返り対話の完了後にバックグラウンドで呼び出され、
会話テキストから事実を抽出して short / long ストレージに保存する。
"""

import logging

from app.memory.extractor import extract_memories
from app.memory.manager import save_memories
from app.schemas.reflection import ReflectionRequest

logger = logging.getLogger(__name__)


def extract_and_save_from_reflection(req: ReflectionRequest) -> None:
    """
    振り返りリクエストの会話履歴とユーザー発言から事実を抽出し、
    short / long ストレージに保存する。

    抽出・保存の失敗はログに記録するが例外は伝播させない（非クリティカル処理）。
    """
    try:
        messages = [{"role": m.role, "content": m.content} for m in req.messages]
        facts = extract_memories(messages, req.user_message)
        if facts:
            save_memories(req.user_id, facts)
    except Exception as e:
        logger.warning("Memory extraction failed (non-critical): %s", e)
