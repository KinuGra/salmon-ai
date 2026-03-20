import os

from google import genai
from google.genai import types

from app.prompts.report import REPORT_PROMPT
from app.schemas.report import ReportRequest, ReportResponse


def generate_report(req: ReportRequest) -> ReportResponse:
    """
    Goから受け取ったコンテキスト文字列をプロンプトに埋め込み、
    Gemini APIで自己分析レポートを生成して返します。
    ClientError / ServerError はそのままルーターに伝播させ、
    ルーター側で適切なHTTPステータスに変換します。
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    client = genai.Client(api_key=api_key)

    prompt = REPORT_PROMPT.format(context=req.context)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=2048,
        ),
    )

    if not response.candidates:
        raise ValueError(f"No candidates in response. prompt_feedback: {response.prompt_feedback}")

    candidate = response.candidates[0]
    if not candidate.content.parts:
        raise ValueError(f"Empty content. finish_reason: {candidate.finish_reason}")

    return ReportResponse(content=response.text)
