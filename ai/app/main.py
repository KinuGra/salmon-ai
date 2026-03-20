from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv, find_dotenv

app = FastAPI()

# .env ファイルを明示的に読み込む
load_dotenv(find_dotenv())

# GeminiのAPIキーを環境変数から取得して設定
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class TaskEstimateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    user_context: Optional[str] = None

class TaskEstimateResponse(BaseModel):
    estimated_hours: float
    reasoning: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/estimate", response_model=TaskEstimateResponse)
def estimate_task(request: TaskEstimateRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured in the AI service")

    # プロンプトの構築
    prompt = f"タスク名: {request.title}\n"
    if request.description:
        prompt += f"詳細: {request.description}\n"
    if request.category:
        prompt += f"カテゴリ: {request.category}\n"
    if request.user_context:
        prompt += f"ユーザー特性・コンテキスト: {request.user_context}\n"

    system_prompt = (
        "あなたはプロフェッショナルなタスク見積もりアシスタントです。\n"
        "提供されたタスク情報とユーザーのコンテキストに基づき、作業にかかる見積もり時間（時間単位）を算出してください。\n"
        "出力は必ずJSON形式で、以下のキーを含めてください：\n"
        '{"estimated_hours": 1.5, "reasoning": "なぜなら..."}'
    )

    try:
        # 無料枠で利用可能で最新・高性能な「gemini-2.5-flash」を使用
        model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            system_instruction=system_prompt
        )

        # JSON形式での出力を強制
        generation_config = genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.3
        )

        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
        
        result = response.text
        parsed_result = json.loads(result)
        
        return TaskEstimateResponse(
            estimated_hours=float(parsed_result.get("estimated_hours", 0)),
            reasoning=parsed_result.get("reasoning", "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
