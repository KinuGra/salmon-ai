import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse

from app.memory.extractor import extract_memories
from app.memory.manager import save_memories
from app.schemas.reflection import ReflectionRequest
from app.services.reflection_service import generate_reflection_stream

router = APIRouter()
logger = logging.getLogger(__name__)


def _extract_and_save(req: ReflectionRequest) -> None:
    """
    会話から事実を抽出して short / long ストレージに保存する。
    ストリーミング完了後にバックグラウンドで実行される。
    """
    try:
        messages = [{"role": m.role, "content": m.content} for m in req.messages]
        facts = extract_memories(messages, req.user_message)
        if facts:
            save_memories(req.user_id, facts)
    except Exception as e:
        logger.warning("Memory extraction failed (non-critical): %s", e)


@router.post("/reflection/stream")
def reflection_stream(
    req: ReflectionRequest,
    background_tasks: BackgroundTasks,
) -> StreamingResponse:
    """
    Goバックエンドからコンテキストと会話履歴を受け取り、
    Gemini APIでAI返答をストリーミング生成します。
    ストリーミング完了後、会話から事実を抽出してメモリに保存します。

    Returns:
        StreamingResponse: テキストのストリーミングレスポンス
    """
    try:
        background_tasks.add_task(_extract_and_save, req)
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
