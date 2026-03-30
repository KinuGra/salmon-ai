"""
記憶の読み書きを担当するモジュール。

- Short-term: Redis（今日の状態、TTL 48時間）
- Long-term:  ChromaDB（行動パターン・傾向の永続化）
"""

import json
import os
import uuid
from datetime import date, datetime, timezone

import chromadb
import redis as redis_module

# ── シングルトン ────────────────────────────────────────────────
_redis_client: redis_module.Redis | None = None
_chroma_collection = None

SHORT_TERM_TTL_SEC = 48 * 3600  # 48時間


def _get_redis() -> redis_module.Redis:
    global _redis_client
    if _redis_client is None:
        url = os.getenv("REDIS_URL", "redis://redis:6379")
        _redis_client = redis_module.from_url(url, decode_responses=True)
    return _redis_client


def _get_collection() -> chromadb.Collection:
    global _chroma_collection
    if _chroma_collection is None:
        persist_dir = os.getenv("CHROMA_PERSIST_DIR", "/chroma_data")
        client = chromadb.PersistentClient(path=persist_dir)
        _chroma_collection = client.get_or_create_collection(
            name="long_term_memories",
            metadata={"hnsw:space": "cosine"},
        )
    return _chroma_collection


# ── Short-term（Redis） ─────────────────────────────────────────

def save_short_term(user_id: str, facts: list[dict]) -> None:
    """今日の短期記憶に facts を追加する（重複テキストはスキップ）。"""
    if not facts:
        return
    r = _get_redis()
    key = f"short:{user_id}:{date.today().isoformat()}"

    existing_raw = r.get(key)
    existing: list[dict] = json.loads(existing_raw) if existing_raw else []

    existing_texts = {f["fact"] for f in existing}
    new_facts = [f for f in facts if f["fact"] not in existing_texts]
    if not new_facts:
        return

    r.setex(key, SHORT_TERM_TTL_SEC, json.dumps(existing + new_facts, ensure_ascii=False))


def get_short_term(user_id: str) -> list[dict]:
    """今日の短期記憶を返す。存在しない場合は空リスト。"""
    r = _get_redis()
    key = f"short:{user_id}:{date.today().isoformat()}"
    raw = r.get(key)
    return json.loads(raw) if raw else []


# ── Long-term（ChromaDB） ──────────────────────────────────────

def save_long_term(user_id: str, fact: dict) -> None:
    """長期記憶を ChromaDB に追加する。"""
    collection = _get_collection()
    collection.add(
        ids=[str(uuid.uuid4())],
        documents=[fact["fact"]],
        metadatas=[{
            "user_id": user_id,
            "category": fact.get("category", "behavior"),
            "confidence": float(fact.get("confidence", 0.7)),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "access_count": 0,
        }],
    )


def query_long_term(
    user_id: str,
    query: str,
    n_results: int = 15,
    category: str | None = None,
) -> list[dict]:
    """
    ChromaDB から意味検索でユーザーの長期記憶を返す。
    戻り値: [{"fact", "category", "confidence", "created_at", "distance"}]
    """
    collection = _get_collection()

    where: dict = {"user_id": user_id}
    if category:
        where["category"] = category

    try:
        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, max(collection.count(), 1)),
            where=where,
            include=["distances", "documents", "metadatas"],
        )
    except Exception:
        return []

    if not results["ids"][0]:
        return []

    items = []
    for doc, dist, meta in zip(
        results["documents"][0],
        results["distances"][0],
        results["metadatas"][0],
    ):
        items.append({
            "fact": doc,
            "category": meta.get("category", "behavior"),
            "confidence": meta.get("confidence", 0.7),
            "created_at": meta.get("created_at", ""),
            "distance": dist,
        })

    # access_count をインクリメント（best-effort）
    try:
        ids = results["ids"][0]
        for i, meta in enumerate(results["metadatas"][0]):
            updated_meta = dict(meta)
            updated_meta["access_count"] = int(meta.get("access_count", 0)) + 1
            collection.update(ids=[ids[i]], metadatas=[updated_meta])
    except Exception:
        pass

    return items


def delete_long_term_by_fact(user_id: str, fact_text: str) -> None:
    """指定した事実テキストの長期記憶を削除する。"""
    collection = _get_collection()
    try:
        collection.delete(where={"user_id": user_id, "fact": fact_text})
    except Exception:
        pass


def get_all_long_term_metadata(user_id: str) -> tuple[list[str], list[dict]]:
    """ユーザーの全長期記憶の (ids, metadatas) を返す。"""
    collection = _get_collection()
    try:
        result = collection.get(
            where={"user_id": user_id},
            include=["metadatas"],
        )
        return result["ids"], result["metadatas"]
    except Exception:
        return [], []
