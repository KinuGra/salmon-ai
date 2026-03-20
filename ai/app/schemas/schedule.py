from pydantic import BaseModel


class TaskItem(BaseModel):
    """AI診断に必要なタスク情報。GoのTaskモデルから必要なフィールドのみ抽出。"""

    title: str
    priority: int | None  # 1=高, 2=中, 3=低, Noneは未設定
    start_time: str | None  # タイムブロックの開始時刻 ISO8601形式
    end_time: str | None  # タイムブロックの終了時刻 ISO8601形式


class ScheduleRequest(BaseModel):
    """GoのBackendからPythonに送るリクエスト。"""

    tasks: list[TaskItem]  # 当日のタイムブロック済みタスク一覧
    context: str  # ContextBuilderが生成したユーザーの状況（markdown形式）


class Issues(BaseModel):
    """スケジュールの診断結果。Pythonで計算した値をそのまま返す。"""

    buffer_shortage: bool  # タスク合計が8時間超の場合にTrue
    priority_bias: bool  # 優先度1（高）のタスクが1件もない場合にTrue


class ScheduleResponse(BaseModel):
    """Pythonからフロントエンドまで返すレスポンス。"""

    issues: Issues  # 診断結果
    advice: str  # Geminiが生成したアドバイス文章
