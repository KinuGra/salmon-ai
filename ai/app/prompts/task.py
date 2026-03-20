SYSTEM_PROMPT = (
    "あなたはプロフェッショナルなタスク見積もりアシスタントです。\n"
    "提供されたタスク情報とユーザーのコンテキストに基づき、作業にかかる見積もり時間（時間単位）を算出してください。\n"
    "出力は必ずJSON形式で、以下のキーを含めてください：\n"
    '{"estimated_hours": 1.5, "reasoning": "なぜなら..."}'
)

def build_task_estimate_prompt(title: str, description: str | None, category: str | None, user_context: str | None) -> str:
    prompt = f"タスク名: {title}\n"
    if description:
        prompt += f"詳細: {description}\n"
    if category:
        prompt += f"カテゴリ: {category}\n"
    if user_context:
        prompt += f"ユーザー特性・コンテキスト: {user_context}\n"
    return prompt