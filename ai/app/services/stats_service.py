import json
import os

import google.generativeai as genai

from app.prompts.stats import STATS_COMMENT_PROMPT
from app.schemas.stats import StatsCommentRequest, StatsCommentResponse


def generate_stats_comment(req: StatsCommentRequest) -> StatsCommentResponse:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.7,
            max_output_tokens=512,
            response_mime_type="application/json",
            response_schema={
                "type": "object",
                "properties": {
                    "comment": {"type": "string"},
                    "follow_message": {"type": "string"},
                },
                "required": ["comment", "follow_message"],
            },
        ),
    )

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

    response = model.generate_content(prompt)
    data = json.loads(response.text)

    return StatsCommentResponse(
        comment=data["comment"],
        follow_message=data["follow_message"],
    )
