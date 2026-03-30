import os
import re

from google import genai
from google.genai import types

from app.memory.injector import enrich_context
from app.prompts.report import COLD_START_PROMPT, REPORT_PROMPT
from app.schemas.report import ReportRequest, ReportResponse

# 施策2: コールドスタート判定の閾値。
# タスク5件未満は統計的パターン抽出が困難なため、行動経済学ベースの仮説提示プロンプトを使用します。
_COLD_START_THRESHOLD = 5


def _select_prompt(context: str) -> str:
    """
    コンテキスト文字列からタスク件数を抽出し、適切なプロンプトテンプレートを返します（施策2）。
    「合計: N件」という形式は context_builder.go の BuildFullContext が保証します。
    パース失敗時はフォールバックとして通常プロンプトを使用します。
    """
    match = re.search(r'合計:\s*(\d+)件', context)
    task_count = int(match.group(1)) if match else _COLD_START_THRESHOLD
    return COLD_START_PROMPT if task_count < _COLD_START_THRESHOLD else REPORT_PROMPT


def generate_report(req: ReportRequest) -> ReportResponse:
    """
    Goから受け取ったコンテキスト文字列をプロンプトに埋め込み、
    Gemini APIで自己分析レポートを生成して返します。
    - 施策2: タスク件数に応じてコールドスタート用プロンプトを選択します。
    ClientError / ServerError はそのままルーターに伝播させ、
    ルーター側で適切なHTTPステータスに変換します。
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    client = genai.Client(api_key=api_key)

    enriched_context = enrich_context(req.user_id, req.context)
    prompt_template = _select_prompt(req.context)
    prompt = prompt_template.format(context=enriched_context)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=8192,  # 日本語長文レポート用（日本語は1文字複数トークン消費するため余裕を持たせる）
        ),
    )

    if not response.candidates:
        raise ValueError(f"No candidates in response. prompt_feedback: {response.prompt_feedback}")

    candidate = response.candidates[0]
    if not candidate.content.parts:
        raise ValueError(f"Empty content. finish_reason: {candidate.finish_reason}")

    return ReportResponse(content=response.text)
