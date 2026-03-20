import json
import os

from google import genai
from google.genai import types

from app.prompts.stats import STATS_COMMENT_PROMPT
from app.schemas.stats import StatsCommentRequest, StatsCommentResponse


def generate_stats_comment(req: StatsCommentRequest) -> StatsCommentResponse:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    client = genai.Client(api_key=api_key)

    cur = req.current
    prev = req.previous

    prompt = STATS_COMMENT_PROMPT.format(
        current_completed=cur.completed_count,
        current_grass=cur.grass_count,
        ach100_cur=cur.achievement_counts.get(100, 0),
        ach70_cur=cur.achievement_counts.get(70, 0),
        ach30_cur=cur.achievement_counts.get(30, 0),
        ach0_cur=cur.achievement_counts.get(0, 0),
        previous_completed=prev.completed_count,
        previous_grass=prev.grass_count,
        ach100_prev=prev.achievement_counts.get(100, 0),
        ach70_prev=prev.achievement_counts.get(70, 0),
        ach30_prev=prev.achievement_counts.get(30, 0),
        ach0_prev=prev.achievement_counts.get(0, 0),
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=4096,
            response_mime_type="application/json",
        ),
    )

    data = json.loads(response.text)

    return StatsCommentResponse(
        comment=data["comment"],
        follow_message=data["follow_message"],
    )
