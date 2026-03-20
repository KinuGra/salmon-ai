import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.reflection import ReflectionRequest
from app.services.reflection_service import generate_reflection_stream

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/reflection/stream")
def reflection_stream(req: ReflectionRequest) -> StreamingResponse:
    """
    Goバックエンドからコンテキストと会話履歴を受け取り、
    Gemini APIでAI返答をストリーミング生成します。

    Returns:
        StreamingResponse: テキストのストリーミングレスポンス
    """
    try:
        return StreamingResponse(
            generate_reflection_stream(req),
            media_type="text/plain",
        )
    except ValueError as e:
        logger.error("Reflection stream config error", exc_info=e)
        raise HTTPException(status_code=500, detail="Reflection stream is not configured correctly.")
    except Exception as e:
        logger.error("Reflection stream failed", exc_info=e)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during reflection stream.")
