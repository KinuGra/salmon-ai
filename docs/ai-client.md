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
```

GoはAI処理をPythonに丸投げするだけで、AI処理の実装はすべてPython側にあります。

---

## 環境変数

| 変数名           | 説明            | デフォルト値     |
| ---------------- | --------------- | ---------------- |
| `AI_SERVICE_URL` | AIサービスのURL | `http://ai:8000` |

Docker Compose環境では `AI_SERVICE_URL` の設定は不要です。自動で `http://ai:8000` を使います。

`go run` で直接起動する場合は `backend/.env` に以下を設定してください。

```env
AI_SERVICE_URL=http://localhost:8000
```

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
    c.JSON(500, gin.H{"error": err.Error()})
    return
}

var res EstimateResponse
if err := json.Unmarshal(data, &res); err != nil {
    c.JSON(500, gin.H{"error": "failed to parse response"})
    return
}
```

### SSEストリーミング

振り返りAI対話のように返答をリアルタイムで流す場合は `Stream` を使います。第3引数にチャンクを受け取るたびに呼ばれる関数を渡します。

```go
err := aiClient.Stream("/reflection/stream", req, func(chunk []byte) {
    sse.Send(c, string(chunk))
})
if err != nil {
    sse.Send(c, fmt.Sprintf("error: %s", err.Error()))
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

// 通常のPOST（結果を一括で返す）
func (h *AIHandler) Estimate(c *gin.Context) {
    data, err := h.aiClient.Post("/estimate", req)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    c.Data(200, "application/json", data)
}

// SSEストリーミング（1トークンずつ流す）
func (h *AIHandler) ReflectionStream(c *gin.Context) {
    sse.SetHeaders(c)

    err := h.aiClient.Stream("/reflection/stream", req, func(chunk []byte) {
        sse.Send(c, string(chunk))
    })
    if err != nil {
        sse.Send(c, fmt.Sprintf("error: %s", err.Error()))
        return
    }
}
```

---

## 各AI機能とメソッドの対応

| 機能                     | メソッド |
| ------------------------ | -------- |
| 工数見積もり             | Post     |
| 見積もりレビュー         | Post     |
| スケジューリングサポート | Post     |
| 振り返りAI対話           | Stream   |
| 自己分析レポート生成     | Post     |
| 統計コメント生成         | Post     |

---

## エラーハンドリング

以下のケースでエラーが返ります。

| ケース                         | エラーメッセージ                               |
| ------------------------------ | ---------------------------------------------- |
| AIサービスが起動していない     | `failed to get request: connection refused`    |
| リクエストボディのJSON変換失敗 | `failed to marshal request body`               |
| レスポンスボディの読み取り失敗 | `failed to read response body`                 |
| 2xx以外のステータスコード      | `unexpected status code: {code}, body: {body}` |
| ストリーム読み取り失敗         | `failed to read stream`                        |

AIサービスが起動していない場合でもGoのサーバーは起動します。AI機能を使うエンドポイントだけがエラーを返します。

---

## よくある質問

**Q. `go run` で直接起動しているのに接続できない**

`AI_SERVICE_URL` が未設定の場合、デフォルトの `http://ai:8000` を使おうとしますが、`go run` 環境では `ai` という名前は解決できません。`backend/.env` に以下を設定してください。

```env
AI_SERVICE_URL=http://localhost:8000
```

**Q. AIサービスに新しいエンドポイントを追加した場合**

Python側にエンドポイントを追加するだけで、Go側のクライアントコードを変更する必要はありません。

```go
// 新しいエンドポイントもそのまま使える
data, err := aiClient.Post("/new-endpoint", req)
data, err := aiClient.Get("/new-endpoint", nil)
err  := aiClient.Stream("/new-endpoint", req, callback)
```
