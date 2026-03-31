import json
import logging
import os
import re
import time

from fastapi import HTTPException
from google import genai
from google.genai import types

from app.constants import GEMINI_MODEL
from app.prompts.task import SYSTEM_PROMPT, build_task_estimate_prompt
from app.schemas.task import TaskEstimateRequest, TaskEstimateResponse

logger = logging.getLogger(__name__)

_DAILY_QUOTA_RE = re.compile(r"GenerateRequestsPerDay", re.IGNORECASE)
_RETRY_DELAY_RE = re.compile(r"retryDelay.*?(\d+)s", re.IGNORECASE | re.DOTALL)
_MAX_RETRIES = 3


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

    last_error: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
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
            logger.error(f"Failed to parse JSON from Gemini response: {e}")
            raise HTTPException(status_code=500, detail="Failed to parse task estimate from AI")
        except Exception as e:
            error_str = str(e)
            last_error = e
            if "429" in error_str:
                # デイリークォータ枯渇はリトライ不可
                if _DAILY_QUOTA_RE.search(error_str):
                    logger.warning(f"Daily quota exhausted for Gemini API: {e}")
                    raise HTTPException(status_code=429, detail="Gemini API daily quota exhausted")
                # 分あたりレート制限はリトライ
                wait = 2 ** attempt
                m = _RETRY_DELAY_RE.search(error_str)
                if m:
                    wait = max(wait, int(m.group(1)))
                logger.warning(f"Rate limited (attempt {attempt + 1}/{_MAX_RETRIES}), retrying in {wait}s...")
                time.sleep(wait)
            else:
                logger.error(f"Error calling Gemini AI: {e}")
                raise HTTPException(status_code=500, detail="Internal server error occurred while processing task estimate")

    logger.error(f"All {_MAX_RETRIES} retries failed: {last_error}")
    raise HTTPException(status_code=429, detail="Gemini API rate limit exceeded after retries")
