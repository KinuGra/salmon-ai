import logging

from fastapi import APIRouter, HTTPException

from app.schemas.stats import StatsCommentRequest, StatsCommentResponse
from app.services.stats_service import generate_stats_comment

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/stats/comment", response_model=StatsCommentResponse)
def stats_comment_endpoint(req: StatsCommentRequest) -> StatsCommentResponse:
    try:
        return generate_stats_comment(req)
    except ValueError as e:
        logger.error("Stats comment config error", exc_info=e)
        raise HTTPException(status_code=500, detail="Stats comment is not configured correctly.")
    except Exception as e:
        logger.error("Stats comment generation failed", exc_info=e)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during stats comment generation.")
