import logging

import google.genai.errors
from fastapi import APIRouter, HTTPException

from app.schemas.report import ReportRequest, ReportResponse
from app.services.report_service import generate_report

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/report/generate", response_model=ReportResponse)
def generate_report_endpoint(req: ReportRequest) -> ReportResponse:
    """
    Goバックエンドからコンテキスト文字列を受け取り、
    Gemini APIで自己分析レポートを生成して返します。

    Returns:
        ReportResponse: Markdown形式のレポート本文
    """
    try:
        return generate_report(req)
    except google.genai.errors.ClientError as e:
        # 429: レート制限
        if getattr(e, "code", None) == 429:
            logger.warning("Gemini rate limit exceeded for report generation")
            raise HTTPException(status_code=429, detail="レート制限に達しました。しばらく待ってから再試行してください。")
        logger.error("Gemini client error during report generation", exc_info=e)
        raise HTTPException(status_code=500, detail="AI APIでエラーが発生しました。")
    except google.genai.errors.ServerError as e:
        # 503: Gemini側の一時的な高負荷
        logger.warning("Gemini server unavailable for report generation", exc_info=e)
        raise HTTPException(status_code=503, detail="AIサービスが一時的に混雑しています。しばらく待ってから再試行してください。")
    except ValueError as e:
        # GEMINI_API_KEY 未設定・レスポンス不正などの設定エラー
        logger.error("Report generation config error", exc_info=e)
        raise HTTPException(status_code=500, detail="レポート生成の設定に問題があります。")
    except Exception as e:
        logger.error("Report generation failed unexpectedly", exc_info=e)
        raise HTTPException(status_code=500, detail="レポート生成中に予期せぬエラーが発生しました。")
