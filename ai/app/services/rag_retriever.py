import hashlib
import logging
import os
from typing import Optional

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

logger = logging.getLogger(__name__)

# ユーザーIDをキーとしたインデックスキャッシュ
# value は (context_hash, Chroma インスタンス) のタプル
_cache: dict[int, tuple[str, Chroma]] = {}

_splitter = RecursiveCharacterTextSplitter(
    separators=["\n## ", "\n### ", "\n\n", "\n", "。", ""],
    chunk_size=400,
    chunk_overlap=100,
)


def _get_embeddings() -> GoogleGenerativeAIEmbeddings:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004",
        google_api_key=api_key,
    )


def _context_hash(context: str) -> str:
    return hashlib.md5(context.encode()).hexdigest()


def _build_index(context: str) -> Chroma:
    """context テキストをチャンク分割し、Chroma インメモリ インデックスを返します。"""
    chunks = _splitter.split_text(context)
    embeddings = _get_embeddings()
    return Chroma.from_texts(texts=chunks, embedding=embeddings)


def retrieve(user_id: int, context: str, query: str, k: int = 5) -> list[str]:
    """
    user_id に対応するコンテキストを検索し、query に関連する上位 k チャンクを返します。

    - 同一 user_id かつ同一 context ハッシュの場合はキャッシュを再利用します。
    - context が変わった場合（新しいデータ追加など）はインデックスを再構築します。
    - context が空の場合は空リストを返します。
    """
    if not context.strip():
        return []

    h = _context_hash(context)
    cached = _cache.get(user_id)

    if cached is None or cached[0] != h:
        logger.info("RAG: building index for user_id=%d (hash=%s)", user_id, h[:8])
        index = _build_index(context)
        _cache[user_id] = (h, index)
    else:
        logger.debug("RAG: cache hit for user_id=%d", user_id)
        index = cached[1]

    docs = index.similarity_search(query, k=k)
    return [doc.page_content for doc in docs]
