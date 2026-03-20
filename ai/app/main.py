from fastapi import FastAPI

from app.routers.report import router as report_router
from app.routers.stats import router as stats_router

app = FastAPI(title="salmon-ai AI Service")

# ── ルーター登録 ──────────────────────────────────────────────
app.include_router(report_router)
app.include_router(stats_router)


@app.get("/health")
def health():
    return {"status": "ok"}
