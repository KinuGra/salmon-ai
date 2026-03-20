from pydantic import BaseModel
from typing import Optional

class TaskEstimateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    user_context: Optional[str] = None

class TaskEstimateResponse(BaseModel):
    estimated_hours: float
    reasoning: str