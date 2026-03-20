import json
import logging
import os

from fastapi import HTTPException
from google import genai
from google.genai import types

from app.prompts.task import SYSTEM_PROMPT, build_task_estimate_prompt
from app.schemas.task import TaskEstimateRequest, TaskEstimateResponse

logger = logging.getLogger(__name__)


def estimate_task_service(request: TaskEstimateRequest) -> TaskEstimateResponse:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured in the AI service")

    client = genai.Client(api_key=api_key)

    prompt = build_task_estimate_prompt(
        title=request.title,
        description=request.description,
        category=request.category,
        user_context=request.user_context
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{SYSTEM_PROMPT}\n\n{prompt}",
            config=types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )

        parsed_result = json.loads(response.text)

        return TaskEstimateResponse(
            estimated_hours=float(parsed_result.get("estimated_hours", 0)),
            reasoning=parsed_result.get("reasoning", "")
        )
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Gemini response: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse task estimate from AI")
    except Exception as e:
        logger.error(f"Error calling Gemini AI: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error occurred while processing task estimate")
