import os
from typing import Generator

import google.generativeai as genai

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

    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.7,
            max_output_tokens=1024,
        ),
    )

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

    response = model.generate_content(prompt, stream=True)
    for chunk in response:
        if chunk.text:
            yield chunk.text
