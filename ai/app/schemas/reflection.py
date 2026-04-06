from typing import List

from pydantic import BaseModel


class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ReflectionRequest(BaseModel):
    context: str
    user_id: int = 0          # RAG インデックスのキー（後方互換のためデフォルト値あり）
    user_profile: str = ""    # プロファイルアンカー: user_context + 最新 Report（後方互換のためデフォルト値あり）
    messages: List[Message]
    user_message: str
