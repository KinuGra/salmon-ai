from fastapi import FastAPI
from dotenv import load_dotenv, find_dotenv
from app.routers import task

# .env ファイルを明示的に読み込む
load_dotenv(find_dotenv())

app = FastAPI(title="Salmon AI API")

# ルーターの登録
app.include_router(task.router)

@app.get("/health")
def health():
    return {"status": "ok"}
