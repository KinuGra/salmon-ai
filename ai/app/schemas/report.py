from pydantic import BaseModel


class ReportRequest(BaseModel):
    """GoのContextBuilderが生成したコンテキスト文字列を受け取ります。"""
    user_id: str
    context: str
    task_count: int


class ReportResponse(BaseModel):
    """Geminiが生成したMarkdown形式の自己分析レポートを返します。"""
    content: str
