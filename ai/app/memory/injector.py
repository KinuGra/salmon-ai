"""
System Prompt へのメモリコンテキスト注入モジュール。

取得した長期記憶・短期記憶をテキストセクションとして合成し、
既存のコンテキスト文字列の先頭に追加する。
"""

from app.memory.retriever import get_full_context

_MEMORY_SECTION_TEMPLATE = """\
## 【記憶情報】パーソナライズドコンテキスト

{today_section}{behavior_section}{strategy_section}\
記憶情報は参考として使い、現在の会話・データを優先してください。
confidence が低い情報（目安 0.8 未満）は「〜の傾向がありましたね」と表現し断定しないでください。

---

"""


def build_memory_context(user_id: str, task_description: str) -> str:
    """
    ユーザーの記憶情報をテキストセクションとして返す。
    記憶が存在しない場合は空文字列を返す。
    """
    ctx = get_full_context(user_id, task_description)

    today_lines = [f"- {f['fact']}" for f in ctx["today_state"]]
    behavior_lines = [f"- {m['fact']}" for m in ctx["behavior_patterns"]]
    strategy_lines = [f"- {m['fact']}" for m in ctx["effective_strategies"]]

    if not any([today_lines, behavior_lines, strategy_lines]):
        return ""

    today_section = (
        "### 今日の状態\n" + "\n".join(today_lines) + "\n\n"
        if today_lines else ""
    )
    behavior_section = (
        "### 行動パターン（過去の記憶から）\n" + "\n".join(behavior_lines) + "\n\n"
        if behavior_lines else ""
    )
    strategy_section = (
        "### 過去に有効だった戦略\n" + "\n".join(strategy_lines) + "\n\n"
        if strategy_lines else ""
    )

    return _MEMORY_SECTION_TEMPLATE.format(
        today_section=today_section,
        behavior_section=behavior_section,
        strategy_section=strategy_section,
    )


def enrich_context(user_id: str, context: str) -> str:
    """
    既存のコンテキスト文字列の先頭に記憶セクションを追加して返す。
    記憶がない場合は元の context をそのまま返す。
    """
    memory_section = build_memory_context(user_id, context[:500])  # 先頭500文字をクエリに使用
    if not memory_section:
        return context
    return memory_section + context
