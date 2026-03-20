from app.routers.report import router as report_router
from app.routers.schedule import router as schedule_router
from fastapi import FastAPI

app = FastAPI(title="salmon-ai AI Service")

# ── ルーター登録 ──────────────────────────────────────────────
app.include_router(report_router)
app.include_router(schedule_router)


@app.get("/health")
def health():
    return {"status": "ok"}
