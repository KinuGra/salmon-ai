# SSEユーティリティ

## 概要

振り返りAI対話でGeminiの返答をリアルタイムにストリーミングするための共通処理です。
SSE（Server-Sent Events）はHTTP接続を維持したままサーバーからデータを少しずつ流す仕組みで、フロントは `EventSource` で受け取ります。

---

## SSEとは

通常のHTTPリクエストはリクエスト→レスポンスで接続が切れます。SSEは接続を維持したままサーバーが好きなタイミングでデータを流し続けられます。

```
通常のHTTP
フロント → リクエスト → サーバー
フロント ← レスポンス ← サーバー（接続が切れる）

SSE
フロント → 接続を開く → サーバー
フロント ←  chunk 1  ← サーバー
フロント ←  chunk 2  ← サーバー
フロント ←  chunk 3  ← サーバー（接続を維持し続ける）
```

このアプリではGeminiの返答を1トークンずつフロントに流すために使います。

---

## 仕組み

```
フロントエンド（EventSource）
  ↓ GET /ai/reflection/stream
Go（backend）
  ↓ SetHeaders でSSEヘッダーをセット
  ↓ aiClient.Stream でPythonにリクエストしてチャンクを受け取る
  ↓ Send で1チャンクずつフロントに流す
フロントエンド
  → リアルタイムで表示
```

---

## API

### SetHeaders

SSEに必要なレスポンスヘッダーをセットします。SSEエンドポイントの先頭で必ず呼んでください。

```go
sse.SetHeaders(c)
```

セットされるヘッダーは以下の3つです。

| ヘッダー      | 値                | 意味                                            |
| ------------- | ----------------- | ----------------------------------------------- |
| Content-Type  | text/event-stream | SSE形式のレスポンスであることをブラウザに伝える |
| Cache-Control | no-cache          | ブラウザにキャッシュさせない                    |
| Connection    | keep-alive        | HTTP接続を維持し続ける                          |

### Send

1チャンクのテキストをSSE形式でフロントに送信します。

```go
sse.Send(c, "送信したいテキスト")
```

内部では以下の2つを行っています。

```go
c.SSEvent("message", data) // SSE形式でデータを書き込む
c.Writer.Flush()           // バッファを即座にフロントに流す
```

`Flush()` を呼ばないとデータがバッファに溜まり、まとめて送信されてしまいリアルタイム表示になりません。

---

## 使い方

### 基本的な使い方

`sse` と `aiclient` を組み合わせて使います。

```go
import (
    "github.com/salmon-ai/salmon-ai/pkg/sse"
    "fmt"
)

func (h *AIHandler) ReflectionStream(c *gin.Context) {
    // 必ずSetHeadersを最初に呼ぶ
    sse.SetHeaders(c)

    // aiClient.Streamでチャンクを受け取るたびにSendで流す
    err := h.aiClient.Stream("/reflection/stream", req, func(chunk []byte) {
        sse.Send(c, string(chunk))
    })
    if err != nil {
        sse.Send(c, fmt.Sprintf("error: %s", err.Error()))
        return
    }
}
```

### ルーティングへの登録

SSEエンドポイントはGETメソッドで登録します。

```go
// main.go
r.GET("/ai/reflection/stream", aiHandler.ReflectionStream)
```

### フロントエンドでの受け取り方

フロントエンドは `EventSource` を使って接続します。

```typescript
const eventSource = new EventSource("/ai/reflection/stream");

eventSource.onmessage = (event) => {
  // event.data にチャンクが入っている
  console.log(event.data);
};

eventSource.onerror = () => {
  eventSource.close();
};
```

---

## エラーハンドリング

SSE接続中にエラーが発生した場合はエラーメッセージを送信して接続を終了します。

```go
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

## 注意点

**SetHeaders は必ず Send より前に呼ぶ**

`SetHeaders` を呼ぶ前に `Send` を呼ぶとヘッダーが正しくセットされず、フロントがSSEとして認識できません。

```go
// 間違い
sse.Send(c, "データ")
sse.SetHeaders(c)

// 正しい
sse.SetHeaders(c)
sse.Send(c, "データ")
```

**SSEはGETメソッドで登録する**

`EventSource` はGETメソッドしかサポートしていません。

```go
// 間違い
r.POST("/ai/reflection/stream", aiHandler.ReflectionStream)

// 正しい
r.GET("/ai/reflection/stream", aiHandler.ReflectionStream)
```
