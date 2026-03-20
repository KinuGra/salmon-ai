# salmon-ai コードレビュースタイルガイド

## プロジェクト構成

本プロジェクトはモノレポ構成で、以下の4つのサービスで構成されています。

```

root/
├── frontend/ # Next.js 15 (App Router)
├── backend/ # Go + Gin
├── ai/ # Python + FastAPI
└── infra/ # Docker Compose・Dockerfile

```

---

## backend/ のディレクトリ構成

```

backend/
├── cmd/server/
│ └── main.go # エントリーポイント。初期化・ルーティングのみ
├── internal/
│ ├── handler/ # リクエストのパース・レスポンスの返却のみ
│ ├── service/ # ビジネスロジックのみ
│ ├── repository/ # DBアクセスのみ
│ ├── middleware/ # 認証・CORSなどのミドルウェア
│ └── model/ # GORMのモデル定義
└── pkg/
├── aiclient/ # AIサービスへのHTTPクライアント
├── database/ # PostgreSQL接続
└── sse/ # SSEユーティリティ

```

## ai/ のディレクトリ構成

```

ai/
└── app/
├── main.py # エントリーポイント。ルーティングのみ
├── routers/ # エンドポイントの定義
├── services/ # AI処理・Gemini API呼び出し
├── prompts/ # Geminiへのプロンプトテンプレート
└── schemas/ # Pydanticのリクエスト・レスポンス定義

```

---

## アーキテクチャのルール

### Handler・Service・Repositoryの3層構造

それぞれの責務を守ってください。

```

Handler → リクエストのパースとレスポンスの返却のみ
Service → ビジネスロジックのみ
Repository → DBアクセスのみ

```

- HandlerからRepositoryを直接呼ばないでください
- ServiceでDBアクセスを直接行わないでください
- AI処理はPython（ai/）側で行い、Go（backend/）はリクエストの転送のみにしてください

### 新しいファイルの配置

- 汎用的な処理（他のプロジェクトでも使えるもの）は `pkg/` に置いてください
- このアプリ専用の処理は `internal/` に置いてください
- ドキュメントは `docs/` に置いてください

---

## Go（backend）のルール

- userIDは必ず `c.Get("userID")` で取得してください（ハードコード禁止）

```go
// 間違い
userID := uint(1)

// 正しい
userID, exists := c.Get("userID")
if !exists {
    c.JSON(401, gin.H{"error": "unauthorized"})
    return
}
```

- AIサービスへのリクエストは必ず `pkg/aiclient` のクライアントを使ってください

```go
// 間違い
http.Post("http://ai:8000/estimate", ...)

// 正しい
aiClient.Post("/estimate", req)
```

- SSEのストリーミングは必ず `pkg/sse` のユーティリティを使ってください

```go
// 正しい
sse.SetHeaders(c)
err := aiClient.Stream("/reflection/stream", req, func(chunk []byte) {
    sse.Send(c, string(chunk))
})
```

- エラーは必ず処理してください（`_` で無視しない）

```go
// 間違い
db.Create(&task)

// 正しい
if err := db.Create(&task).Error; err != nil {
    return err
}
```

---

## Python（ai）のルール

- リクエスト・レスポンスの型は必ず `app/schemas/` にPydanticで定義してください

```python
# 間違い
@app.post("/estimate")
def estimate(body: dict):
    ...

# 正しい
class EstimateRequest(BaseModel):
    title: str
    description: str
    context: str

@app.post("/estimate")
def estimate(req: EstimateRequest):
    ...
```

- プロンプトは `app/prompts/` に定義してください

```python
# 間違い（routers/やservices/にプロンプトを直書きしない）
prompt = "タスクの工数を見積もってください..."

# 正しい
from app.prompts.estimate import build_prompt
prompt = build_prompt(req)
```

- ビジネスロジックは `app/services/` に置いてください
- Routerから直接Gemini APIを呼ばないでください

```python
# 間違い
@app.post("/estimate")
def estimate(req: EstimateRequest):
    response = model.generate_content(...)  # RouterでGeminiを直接呼ばない

# 正しい
@app.post("/estimate")
def estimate(req: EstimateRequest):
    return estimate_service.estimate(req)   # Serviceに委譲する
```
