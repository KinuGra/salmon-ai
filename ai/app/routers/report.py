from fastapi import APIRouter, HTTPException

from app.schemas.report import ReportRequest, ReportResponse
from app.services.report_service import generate_report

router = APIRouter()


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
    except ValueError as e:
        # GEMINI_API_KEY 未設定などの設定エラー
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
