import google.generativeai as genai
import os
import json
from fastapi import HTTPException
from app.schemas.task import TaskEstimateRequest, TaskEstimateResponse
from app.prompts.task import SYSTEM_PROMPT, build_task_estimate_prompt

def estimate_task_service(request: TaskEstimateRequest) -> TaskEstimateResponse:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured in the AI service")
    
    genai.configure(api_key=GEMINI_API_KEY)
    
    prompt = build_task_estimate_prompt(
        title=request.title,
        description=request.description,
        category=request.category,
        user_context=request.user_context
    )

    try:
        model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            system_instruction=SYSTEM_PROMPT
        )

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