import os
from typing import Generator

from google import genai
from google.genai import types

from app.prompts.reflection import REFLECTION_PROMPT
from app.schemas.reflection import ReflectionRequest


def generate_reflection_stream(req: ReflectionRequest) -> Generator[str, None, None]:
    """
    ユーザーのコンテキストと会話履歴を受け取り、
    Gemini APIで返答をストリーミング生成します。
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    client = genai.Client(api_key=api_key)

    # 会話履歴を読みやすいテキストに変換
    history_lines = []
    for msg in req.messages:
        role_label = "ユーザー" if msg.role == "user" else "AI"
        history_lines.append(f"{role_label}: {msg.content}")
    history = "\n".join(history_lines) if history_lines else "（会話履歴なし）"

    prompt = REFLECTION_PROMPT.format(
        context=req.context,
        history=history,
        user_message=req.user_message,
    )

    for chunk in client.models.generate_content_stream(
        model="gemini-2.0-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=1024,
        ),
    ):
        if chunk.text:
            yield chunk.text
