from fastapi import APIRouter
from app.schemas.task import TaskEstimateRequest, TaskEstimateResponse
from app.services.task import estimate_task_service

router = APIRouter(prefix="", tags=["Task Estimate"])

@router.post("/estimate", response_model=TaskEstimateResponse)
def estimate_task(request: TaskEstimateRequest):
    return estimate_task_service(request)