import json
import os
import re
from datetime import datetime

from google import genai
from google.genai import types

from app.prompts.schedule import SCHEDULE_SUPPORT_PROMPT
from app.schemas.schedule import Issues, ScheduleRequest, ScheduleResponse


def support(req: ScheduleRequest) -> ScheduleResponse:
    # 1. バッファ不足を計算
    buffer_shortage = _check_buffer_shortage(req.tasks)

    # 2. 優先度の偏りを確認
    priority_bias = _check_priority_bias(req.tasks)

    # 3. Geminiでアドバイスを生成
    tasks_text = _format_tasks(req.tasks)
    prompt = SCHEDULE_SUPPORT_PROMPT.format(
        context=req.context,
        tasks=tasks_text,
    )

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=1024,
        ),
    )

    # マークダウンのコードブロックを除去
    text = response.text.strip()
    text = re.sub(r"^```json\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    result = json.loads(text)

    return ScheduleResponse(
        issues=Issues(
            buffer_shortage=buffer_shortage,
            priority_bias=priority_bias,
        ),
        advice=result["advice"],
    )


def _check_buffer_shortage(tasks) -> bool:
    """タスクの合計時間が8時間を超えるかチェック"""
    total_hours = 0.0
    for task in tasks:
        if task.start_time and task.end_time:
            start = datetime.fromisoformat(task.start_time)
            end = datetime.fromisoformat(task.end_time)
            total_hours += (end - start).seconds / 3600
    return total_hours > 8.0


def _check_priority_bias(tasks) -> bool:
    """優先度1（高）のタスクが1件もないかチェック"""
    return not any(task.priority == 1 for task in tasks)


def _format_tasks(tasks) -> str:
    """タスク一覧をプロンプト用のテキストに変換"""
    lines = []
    for task in tasks:
        priority_label = {1: "高", 2: "中", 3: "低"}.get(task.priority, "未設定")
        lines.append(
            f"- {task.title}（優先度: {priority_label}、"
            f"開始: {task.start_time or '未設定'}、"
            f"終了: {task.end_time or '未設定'}）"
        )
    return "\n".join(lines)
