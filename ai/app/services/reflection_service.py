import os
from typing import Generator

import google.genai.errors
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

    try:
        for chunk in client.models.generate_content_stream(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=1024,
            ),
        ):
            if chunk.text:
                yield chunk.text
    except google.genai.errors.ClientError as e:
        if getattr(e, "code", None) == 429:
            yield "\n\n申し訳ありません。AIの利用制限（レートリミット）に達しました。しばらく時間をおいてから再度お試しください。"
        else:
            yield f"\n\nAI処理中にエラーが発生しました。({getattr(e, 'code', 'unknown')})"
    except Exception as e:
        yield f"\n\n予期せぬエラーが発生しました: {str(e)}"
