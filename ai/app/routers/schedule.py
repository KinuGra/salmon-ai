from app.schemas.schedule import ScheduleRequest, ScheduleResponse
from app.services.schedule_service import support
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/schedule/support", response_model=ScheduleResponse)
def schedule_support(req: ScheduleRequest) -> ScheduleResponse:
    try:
        return support(req)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
