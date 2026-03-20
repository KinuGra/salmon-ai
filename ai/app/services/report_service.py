import os

import google.generativeai as genai

from app.prompts.report import REPORT_PROMPT
from app.schemas.report import ReportRequest, ReportResponse


def generate_report(req: ReportRequest) -> ReportResponse:
    """
    Goから受け取ったコンテキスト文字列をプロンプトに埋め込み、
    Gemini APIで自己分析レポートを生成して返します。
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.7,       # 一定のクリエイティビティを許容
            max_output_tokens=2048,
        ),
    )

    prompt = REPORT_PROMPT.format(context=req.context)
    response = model.generate_content(prompt)

    if not response.candidates:
        raise ValueError(f"No candidates in response. prompt_feedback: {response.prompt_feedback}")

    candidate = response.candidates[0]
    if not candidate.content.parts:
        raise ValueError(f"Empty content. finish_reason: {candidate.finish_reason}")

    return ReportResponse(content=response.text)
