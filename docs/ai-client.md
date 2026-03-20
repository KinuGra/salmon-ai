## `docs/ai-client.md`

```markdown
# AIサービスへのHTTPクライアント

## 概要

GoからPython（FastAPI）にHTTPリクエストを投げる共通クライアントです。
工数見積もり・スケジューリングサポート・振り返り対話など、AI機能を使う全エンドポイントでこのクライアントを使い回します。

---

## 仕組み
```

フロントエンド
↓ リクエスト
Go（backend）
↓ AIClientでHTTPリクエストを投げる
Python（ai）
↓ Geminiに問い合わせて結果を返す
Go（backend）
↓ 結果をフロントエンドに返す

````

GoはAI処理をPythonに丸投げするだけで、AI処理の実装はすべてPython側にあります。

---

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|---|---|---|
| `AI_SERVICE_URL` | AIサービスのURL | `http://localhost:8000` |

`backend/.env` に以下を設定してください。

```env
# Docker Compose環境
AI_SERVICE_URL=http://ai:8000

# go runで直接起動する場合は不要（自動でlocalhost:8000を使う）
````

---

## 使い方

### クライアントの初期化

```go
import "github.com/salmon-ai/salmon-ai/pkg/aiclient"

aiClient := aiclient.NewClient()
```

### GETリクエスト

第2引数にクエリパラメータをmapで渡します。パラメータが不要な場合は `nil` を渡します。

```go
// パラメータなし
data, err := aiClient.Get("/health", nil)

// パラメータあり
data, err := aiClient.Get("/estimate", map[string]string{
    "task_id": "1",
})
```

### POSTリクエスト

第2引数にリクエストボディをstructまたはmapで渡します。内部でJSONに変換されます。

```go
// mapで渡す
data, err := aiClient.Post("/estimate", map[string]any{
    "title":       "設計書を書く",
    "description": "API設計書の作成",
})

// structで渡す
type EstimateRequest struct {
    Title       string `json:"title"`
    Description string `json:"description"`
}

data, err := aiClient.Post("/estimate", EstimateRequest{
    Title:       "設計書を書く",
    Description: "API設計書の作成",
})
```

### レスポンスの受け取り

`Get` と `Post` は `[]byte` を返します。JSONとして使う場合は `json.Unmarshal` でstructに変換します。

```go
type EstimateResponse struct {
    AiEstimatedHours float64 `json:"ai_estimated_hours"`
    Reason           string  `json:"reason"`
}

data, err := aiClient.Post("/estimate", req)
if err != nil {
    // エラーハンドリング
    c.JSON(500, gin.H{"error": err.Error()})
    return
}

var res EstimateResponse
if err := json.Unmarshal(data, &res); err != nil {
    c.JSON(500, gin.H{"error": "failed to parse response"})
    return
}
```

---

## ハンドラーでの使い方

AIClientはHandlerに渡して使います。

```go
// main.go
aiClient := aiclient.NewClient()
aiHandler := handler.NewAIHandler(aiClient)
```

```go
// internal/handler/ai.go
type AIHandler struct {
    aiClient *aiclient.Client
}

func NewAIHandler(aiClient *aiclient.Client) *AIHandler {
    return &AIHandler{aiClient: aiClient}
}

func (h *AIHandler) Estimate(c *gin.Context) {
    data, err := h.aiClient.Post("/estimate", req)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    c.Data(200, "application/json", data)
}
```

---

## エラーハンドリング

以下のケースでエラーが返ります。

| ケース                         | エラーメッセージ                            |
| ------------------------------ | ------------------------------------------- |
| AIサービスが起動していない     | `failed to get request: connection refused` |
| リクエストボディのJSON変換失敗 | `failed to marshal request body`            |
| レスポンスボディの読み取り失敗 | `failed to read response body`              |

AIサービスが起動していない場合でもGoのサーバーは起動します。AI機能を使うエンドポイントだけがエラーを返します。

---

## よくある質問

**Q. Docker Composeで起動しているのに接続できない**

`backend/.env` の `AI_SERVICE_URL` が `localhost` になっている可能性があります。Docker Compose内ではサービス名（`ai`）でアクセスする必要があります。

```env
# 間違い
AI_SERVICE_URL=http://localhost:8000

# 正しい
AI_SERVICE_URL=http://ai:8000
```

**Q. AIサービスに新しいエンドポイントを追加した場合**

Python側にエンドポイントを追加するだけで、Go側のクライアントコードを変更する必要はありません。

```go
// 新しいエンドポイントもそのまま使える
data, err := aiClient.Post("/new-endpoint", req)
```

```

```
