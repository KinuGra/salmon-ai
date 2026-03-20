from app.routers import task
from app.routers.reflection import router as reflection_router
from app.routers.report import router as report_router
from app.routers.schedule import router as schedule_router
from app.routers.stats import router as stats_router
from dotenv import find_dotenv, load_dotenv
from fastapi import FastAPI

# .env ファイルを明示的に読み込む
load_dotenv(find_dotenv())

app = FastAPI(title="salmon-ai AI Service")

# ── ルーター登録 ──────────────────────────────────────────────
app.include_router(task.router)
app.include_router(report_router)
app.include_router(schedule_router)
app.include_router(stats_router)
app.include_router(reflection_router)


@app.get("/health")
def health():
    return {"status": "ok"}
