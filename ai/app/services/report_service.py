import os

from app.memory.injector import enrich_context
from app.prompts.report import COLD_START_PROMPT, REPORT_PROMPT
from app.constants import GEMINI_MODEL
from app.schemas.report import ReportRequest, ReportResponse
from google import genai
from google.genai import types

# 施策2: コールドスタート判定の閾値。
# タスク5件未満は統計的パターン抽出が困難なため、行動経済学ベースの仮説提示プロンプトを使用します。
_COLD_START_THRESHOLD = 5


def _select_prompt(task_count: int) -> str:
    """
    Go側から受け取ったタスク件数をもとに適切なプロンプトテンプレートを返します（施策2）。
    context_builder.go のフォーマット変更に依存しない明示的なフィールドで判定します。
    """
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

    try:
        enriched_context = enrich_context(req.user_id, req.context)
    except Exception:
        # Redis / ChromaDB 未起動など記憶取得に失敗した場合は元のコンテキストで続行
        enriched_context = req.context
    prompt_template = _select_prompt(req.task_count)
    prompt = prompt_template.format(context=enriched_context)
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            # gemini-2.0-flash のデフォルト thinking が max_output_tokens の大部分を消費し
            # 日本語レポート本文（1200〜2000文字 ≒ 最大6000トークン）が収まらず切断される。
            # 16384 に引き上げて thinking + レポート本文の両方を収容する。
            max_output_tokens=16384,
        ),
    )

    if not response.candidates:
        raise ValueError(
            f"No candidates in response. prompt_feedback: {response.prompt_feedback}"
        )

    candidate = response.candidates[0]
    if not candidate.content.parts:
        raise ValueError(f"Empty content. finish_reason: {candidate.finish_reason}")

    return ReportResponse(content=response.text)
