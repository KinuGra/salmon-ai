from pydantic import BaseModel


class StatsData(BaseModel):
    completed_count: int
    achievement_counts: dict[int, int]
    grass_count: int


class StatsCommentRequest(BaseModel):
    current: StatsData
    previous: StatsData


class StatsCommentResponse(BaseModel):
    comment: str
    follow_message: str
